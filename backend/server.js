require('dotenv').config();
// Debug: print whether MONGO_URI is present (masked) to help diagnose connection issues
const _mongoUri = process.env.MONGO_URI;
if (!_mongoUri) {
	console.warn('Warning: MONGO_URI is not defined in environment variables');
} else {
	// mask credentials if present for safer logging
	const masked = _mongoUri.length > 60 ? _mongoUri.slice(0, 30) + '...' + _mongoUri.slice(-20) : _mongoUri;
	console.log('MONGO_URI (masked):', masked);
}
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const sellerRoutes = require('./routes/seller');
const cartRoutes = require('./routes/cart');

const app = express();

// middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// connect db
connectDB();

// routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/cart', cartRoutes);

// health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

// Create HTTP server and bind Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });
app.set('io', io);

io.on('connection', (socket) => {
	console.log('Socket connected:', socket.id);
	socket.on('joinOrder', (orderId) => {
		socket.join(`order_${orderId}`);
	});
	socket.on('leaveOrder', (orderId) => {
		socket.leave(`order_${orderId}`);
	});
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
