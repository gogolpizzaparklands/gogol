const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI (some users use one or the other)
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: No MongoDB connection string found. Please set MONGO_URI or MONGODB_URI in your .env');
      process.exit(1);
    }
    // Log a masked version to help debugging without leaking credentials
    const masked = mongoUri.length > 60 ? mongoUri.slice(0, 30) + '...' + mongoUri.slice(-20) : mongoUri;
    console.log('Connecting to MongoDB (masked):', masked);

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
