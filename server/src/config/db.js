const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collaborative-editor';
    // Use a short 3-second selection timeout so developers don't wait too long if DB is not running
    await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 3000
    });
    logger.info(`[Database] MongoDB Connected`);
    global.useInMemoryDb = false;
  } catch (error) {
    logger.warn(`[Database] MongoDB connection failed: ${error.message}`);
    logger.warn(`[Database] Falling back to IN-MEMORY database mode for testing.`);
    global.useInMemoryDb = true;
  }
};

module.exports = connectDB;
