const User = require('../models/User');

exports.getCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const user = await User.findById(req.user._id).select('cart');
    return res.json({ cart: user.cart || [] });
  } catch (err) {
    console.error('getCart error', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.saveCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ msg: 'Not authorized' });
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    // basic validation: ensure product, qty present
    const sanitized = items.map(i => ({ product: i.product, name: i.name, price: i.price, qty: Number(i.qty) || 1 }));
    // Use findByIdAndUpdate to avoid optimistic concurrency (VersionError) when saving
    const updated = await User.findByIdAndUpdate(req.user._id, { $set: { cart: sanitized } }, { new: true }).select('cart');
    if (!updated) return res.status(404).json({ msg: 'User not found' });
    res.json({ cart: updated.cart });
  } catch (err) {
    console.error('saveCart error', err);
    // if it's a version error, give a clear message (client will retry on next sync)
    if (err.name === 'VersionError') return res.status(409).json({ msg: 'Conflict saving cart, please retry' });
    res.status(500).json({ msg: 'Server error' });
  }
};
