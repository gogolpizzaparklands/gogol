const axios = require('axios');

const getToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const url = process.env.MPESA_ENV === 'production' ?
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials' :
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
  const res = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
  return res.data.access_token;
};

const stkPush = async ({ phone, amount, accountReference, transactionDesc, orderId }) => {
  const token = await getToken();
  const shortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14);
  const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
  const url = process.env.MPESA_ENV === 'production' ?
    'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest' :
    'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
  // Normalize and validate phone number to Safaricom expected format: 2547XXXXXXXX
  const normalizePhone = (raw) => {
    if (!raw) return null;
    let p = String(raw).replace(/[^0-9+]/g, '');
    // remove leading + if present
    if (p.startsWith('+')) p = p.slice(1);
    // If starts with 0 (e.g., 07xxxxxxxx or 011xxxxxx) convert to 254...
    if (p.startsWith('0')) {
      p = '254' + p.slice(1);
    }
    // If starts with 7 (local mobile w/o leading 0), add country code
    if (/^7\d{8}$/.test(p)) p = '254' + p;
    // At this point we expect a string like '2547XXXXXXXX' (12 digits)
    if (!/^254\d{9}$/.test(p)) return null;
    return p;
  };

  const safePhone = normalizePhone(phone);
  if (!safePhone) {
    const err = new Error('Invalid phone number for STK Push. Expected Kenyan mobile number (e.g. 07xxxxxxxx or +2547xxxxxxxx).');
    err.code = 'INVALID_PHONE';
    throw err;
  }

  // Validate callback URL - Safaricom requires an HTTPS publicly reachable callback
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!callbackUrl || typeof callbackUrl !== 'string' || !callbackUrl.startsWith('https://')) {
    const e = new Error('Invalid or missing MPESA_CALLBACK_URL. Set MPESA_CALLBACK_URL to a publicly reachable HTTPS URL (for local testing use ngrok and set MPESA_CALLBACK_URL to the forwarded HTTPS URL).');
    e.code = 'INVALID_CALLBACK_URL';
    throw e;
  }

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: safePhone,
    PartyB: shortCode,
    PhoneNumber: safePhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference || String(orderId || ''),
    TransactionDesc: transactionDesc || 'GoGol Pizza Order'
  };

  try {
    const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    return res.data;
  } catch (err) {
    // Surface clearer error for upstream handlers/logging
    console.error('mpesa.stkPush error', err?.response?.data || err.message);
    throw err;
  }
};

module.exports = { getToken, stkPush };
