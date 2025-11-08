const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    const { items, total, deliveryLocation } = req.body;
    const order = new Order({ user: req.user._id, items, total, deliveryLocation });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.getOrder = async (req, res) => {
  try {
    // populate items.product and the ordering user's basic info
    const order = await Order.findById(req.params.id).populate('items.product').populate('user', 'name email phone');
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.listOrders = async (req, res) => {
  try {
    // if seller, restrict to their products; if client list own orders; admin gets all
    const user = req.user;
    let orders;
    if (user.role === 'seller') {
      // simplistic: return orders containing products from this seller (slow but works)
      // populate items.product and the ordering user (name, email, phone) so seller can see client details
      orders = await Order.find({}).populate('items.product').populate('user', 'name email phone');
      orders = orders.filter(o => o.items.some(i => String(i.product && i.product.seller) === String(user._id)));
    } else if (user.role === 'client') {
      orders = await Order.find({ user: user._id }).populate('user', 'name email phone');
    } else {
      orders = await Order.find({}).populate('user', 'name email phone');
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    order.status = status;
    await order.save();
    // emit socket event to listeners
    try {
      const io = req.app.get('io');
      if (io) {
        // emit to room for this order
        io.to(`order_${order._id}`).emit('orderUpdated', { orderId: order._id, status: order.status });
        // global event as well
        io.emit('orderUpdated', { orderId: order._id, status: order.status });
      }
    } catch (e) { console.error('Socket emit error', e); }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.mpesaCallback = async (req, res) => {
  // Mpesa will post payment details here. We'll update order by checkoutRequestId if provided.
  try {
    const body = req.body;
    // Example: extract checkoutRequestId and result
    if (body.Body && body.Body.stkCallback) {
      const stk = body.Body.stkCallback;
      const checkoutRequestId = stk.CheckoutRequestID;
      const resultCode = stk.ResultCode;
      const callbackMeta = stk.CallbackMetadata;
      const mpesaReceipt = (callbackMeta && callbackMeta.Item && callbackMeta.Item.find(i=>i.Name==='MpesaReceiptNumber')) || {};
      const receipt = mpesaReceipt.Value || null;
      const order = await Order.findOne({ 'mpesa.checkoutRequestId': checkoutRequestId });
      if (order) {
        if (resultCode === 0) {
          order.mpesa.isPaid = true;
          order.mpesa.receiptNumber = receipt;
          await order.save();
          // emit payment success to listeners in the order room
          try {
            const io = req.app.get('io');
            if (io) io.to(`order_${order._id}`).emit('mpesaStatus', { orderId: order._id, success: true, receipt });
          } catch (e) { console.error('Socket emit error', e); }
        } else {
          order.mpesa.isPaid = false;
          await order.save();
          try {
            const io = req.app.get('io');
            if (io) io.to(`order_${order._id}`).emit('mpesaStatus', { orderId: order._id, success: false, resultCode });
          } catch (e) { console.error('Socket emit error', e); }
        }
      }
    }
    res.json({ status: 'received' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Delete an order. Sellers may delete orders that include their products; admins may delete any order.
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) return res.status(404).json({ msg: 'Order not found' });

    const user = req.user;
    if (user.role === 'admin') {
      await order.deleteOne();
      // emit socket event
      try { const io = req.app.get('io'); if (io) io.emit('orderDeleted', { orderId: order._id }); } catch(e){console.error(e)}
      return res.json({ msg: 'Order deleted' });
    }

    if (user.role === 'seller') {
      // allow delete only if this order contains at least one product from this seller
      const sellerId = String(user._id);
      const hasProduct = order.items.some(i => i.product && String(i.product.seller) === sellerId);
      if (!hasProduct) return res.status(403).json({ msg: 'Not authorized to delete this order' });
      await order.deleteOne();
      try { const io = req.app.get('io'); if (io) io.emit('orderDeleted', { orderId: order._id }); } catch(e){console.error(e)}
      return res.json({ msg: 'Order deleted' });
    }

    // clients may delete their own orders
    if (user.role === 'client') {
      if (String(order.user) !== String(user._id)) return res.status(403).json({ msg: 'Not authorized to delete this order' });
      await order.deleteOne();
      try { const io = req.app.get('io'); if (io) io.emit('orderDeleted', { orderId: order._id }); } catch(e){console.error(e)}
      return res.json({ msg: 'Order deleted' });
    }

    return res.status(403).json({ msg: 'Not authorized' });
  } catch (err) {
    console.error('deleteOrder error', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
