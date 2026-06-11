const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collaborative-editor';
    // Use a short 3-second selection timeout so developers don't wait too long if DB is not running
    await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[Database] MongoDB Connected`);
    global.useInMemoryDb = false;
  } catch (error) {
    console.warn(`[Database] MongoDB connection failed: ${error.message}`);
    console.warn(`[Database] Falling back to IN-MEMORY database mode for testing.`);
    global.useInMemoryDb = true;
  }
};

module.exports = connectDB;
