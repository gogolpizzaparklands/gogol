const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// GET /api/seller/analytics
exports.analytics = async (req, res) => {
  try {
  // Ensure ObjectId is constructed correctly
  const sellerId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();
    const days = 30;
    const fromDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    // Total sales and orders count (for this seller)
    const totalsPipeline = [
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $match: { 'product.seller': sellerId } },
      { $group: {
        _id: '$_id',
        orderRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
      } },
      { $group: {
        _id: null,
        totalSales: { $sum: '$orderRevenue' },
        ordersCount: { $sum: 1 }
      } }
    ];

    const totalsRes = await Order.aggregate(totalsPipeline);
    const totals = totalsRes[0] || { totalSales: 0, ordersCount: 0 };

    // Revenue by day for last N days
    const revenuePipeline = [
      { $match: { createdAt: { $gte: fromDate } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $match: { 'product.seller': sellerId } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
      } },
      { $sort: { _id: 1 } }
    ];

    const revenueByDayRaw = await Order.aggregate(revenuePipeline);

    // Build full last N days array with zeros for missing days
    const revenueByDay = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0,10);
      const found = revenueByDayRaw.find(r => r._id === key);
      revenueByDay.push({ date: key, revenue: found ? found.revenue : 0 });
    }

    // Top products by revenue and qty
    const topProductsPipeline = [
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $match: { 'product.seller': sellerId } },
      { $group: {
        _id: '$product._id',
        name: { $first: '$product.name' },
        qty: { $sum: '$items.qty' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
      } },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ];

    const topProducts = await Order.aggregate(topProductsPipeline);

    res.json({
      totalSales: totals.totalSales || 0,
      ordersCount: totals.ordersCount || 0,
      revenueByDay,
      topProducts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// GET /api/seller/clients - return registered clients (name, email, phone, joined date)
exports.clients = async (req, res) => {
  try {
    // Only allow seller or admin (route should already protect/authorize)
    const clients = await User.find({ role: 'client' }).select('name email phone createdAt').sort({ createdAt: -1 }).lean();
    res.json(clients);
  } catch (err) {
    console.error('seller.clients error', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
