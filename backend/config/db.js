const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return true;

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/weatherwise';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[db] MongoDB connected');

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[db] MongoDB disconnected');
    });

    return true;
  } catch (err) {
    throw new Error(`[db] MongoDB connection failed at ${uri}: ${err.message}`);
  }
}

function dbIsConnected() {
  return isConnected;
}

module.exports = { connectDB, dbIsConnected };
