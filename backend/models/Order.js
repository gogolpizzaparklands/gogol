const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  qty: Number,
  price: Number
});

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [OrderItemSchema],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Order Received','Preparing','Out for Delivery','Delivered'],
    default: 'Order Received'
  },
  deliveryLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  mpesa: {
    checkoutRequestId: String,
    receiptNumber: String,
    isPaid: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
