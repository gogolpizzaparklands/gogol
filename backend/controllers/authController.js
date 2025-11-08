const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

// In-memory store for seller verification codes. Note: resets on server restart.
const sellerCodes = new Map();

// Helper to send email via Resend. Throws on failure. In dev, if RESEND_API_KEY is not set,
// callers should handle the absence and fall back to returning temp codes in responses.
const sendEmail = async (to, subject, html) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'no-reply@example.com';
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; skipping email send.');
    throw new Error('resend_api_key_missing');
  }
  if (!from || !from.includes('@')) {
    console.warn('RESEND_FROM is not a valid email address:', from);
    throw new Error('invalid_resend_from');
  }
  try {
    await axios.post('https://api.resend.com/emails', {
      from,
      to,
      subject,
      html
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Failed sending email', err?.response?.data || err.message);
    throw err;
  }
};

// Send seller verification code email (uses sendEmail)
const sendVerificationEmail = async (to, code) => {
  const html = `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`;
  await sendEmail(to, 'Your seller login verification code', html);
};

// Forgot password: generate a temporary password, set it on the user (will be hashed by User pre-save), and email it
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: 'Email is required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'No account found for that email' });

    // generate a temporary password (8 chars)
    const temp = Math.random().toString(36).slice(-8);
    user.password = temp;
    await user.save();

    const subject = 'Your temporary password';
    const html = `<p>Hello ${user.name || ''},</p><p>A temporary password was requested for your account. Use the password below to sign in, then change it in your account settings:</p><p><strong>${temp}</strong></p><p>If you did not request this, please contact support.</p>`;

    try {
      await sendEmail(email, subject, html);
      // do not include password in response in production
      if (process.env.NODE_ENV !== 'production') return res.json({ msg: 'Temporary password sent (dev)', temp });
      return res.json({ msg: 'Temporary password sent to your email' });
    } catch (err) {
      console.error('Email send failed', err?.response?.data || err.message);
      // fallback for local dev: return temp in response so developer can continue
      if (process.env.NODE_ENV !== 'production') return res.json({ msg: 'Temporary password (dev)', temp });
      return res.status(500).json({ msg: 'Failed to send email' });
    }
  } catch (err) {
    console.error('forgotPassword error', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  const { name, email, password, phone } = req.body;
  // Force role to 'client' regardless of request body to prevent self-promotion
  const role = 'client';
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });
    user = new User({ name, email, password, role, phone });
    await user.save();
    const token = signToken(user._id);
    // set httpOnly session cookie (no maxAge -> cleared on browser close)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // For production (frontend and backend on different origins) we need SameSite=None
      // and Secure=true so browsers allow the cookie on cross-site POST requests.
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    // Special-case: if credentials match the configured SELLER_EMAIL/SELLER_PASSWORD,
    // initiate a verification code flow instead of direct login.
    if (process.env.SELLER_EMAIL && process.env.SELLER_PASSWORD &&
        email === process.env.SELLER_EMAIL && password === process.env.SELLER_PASSWORD) {
      // generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      sellerCodes.set(email, { code, expiresAt });
      try {
        await sendVerificationEmail(email, code);
        return res.json({ sellerRequiresVerification: true, msg: 'Verification code sent' });
      } catch (err) {
        console.error('Failed sending verification email', err?.response?.data || err.message);
        // In non-production environments allow a developer-friendly fallback that returns the code
        if (process.env.NODE_ENV !== 'production') {
          console.warn('RESEND send failed — returning code in response for local development');
          return res.json({ sellerRequiresVerification: true, msg: 'Verification code (dev)', code });
        }
        return res.status(500).json({ msg: 'Failed to send verification code' });
      }
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    const token = signToken(user._id);
    // issue session cookie so token is removed when the browser session ends
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Verify seller code and sign in (creates seller user if needed)
exports.verifySellerCode = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ msg: 'Missing email or code' });
  const record = sellerCodes.get(email);
  if (!record) return res.status(400).json({ msg: 'No verification initiated for this email' });
  if (Date.now() > record.expiresAt) {
    sellerCodes.delete(email);
    return res.status(400).json({ msg: 'Code expired' });
  }
  if (record.code !== code.toString()) return res.status(400).json({ msg: 'Invalid code' });
  try {
    // Upsert seller user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name: 'Seller', email, password: process.env.SELLER_PASSWORD || Math.random().toString(36), role: 'seller' });
    } else {
      user.role = 'seller';
    }
    await user.save();
    const token = signToken(user._id);
    // issue session cookie so token is removed when the browser session ends
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    sellerCodes.delete(email);
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('verifySellerCode error', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return res.status(401).json({ msg: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token invalid or expired' });
  }
};

exports.me = async (req, res) => {
  if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
  res.json({ user: req.user });
};

exports.logout = async (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
  res.json({ msg: 'Logged out' });
};
