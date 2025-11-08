const { stkPush } = require('../utils/mpesa');
const Order = require('../models/Order');

exports.initiatePayment = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { phone } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    // amount must match order.total
    const amount = order.total;
    const response = await stkPush({ phone: phone.replace(/[^0-9+]/g, ''), amount, accountReference: String(orderId), transactionDesc: `GoGol Pizza Order ${orderId}`, orderId });
    // save checkoutRequestId to order
    if (response && response.CheckoutRequestID) {
      order.mpesa.checkoutRequestId = response.CheckoutRequestID;
      await order.save();
    }
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};