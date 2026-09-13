const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/temple-website';

  mongoose.connection.on('connected', () => {
    console.log(`[db] MongoDB connected -> ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  // Fail within ~10s if the database is unreachable (bad URI, IP not
  // allowlisted in Atlas, etc.) instead of the driver's 30s default - makes
  // a misconfigured deploy fail fast and obviously rather than hanging.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  return mongoose.connection;
}

module.exports = connectDB;
