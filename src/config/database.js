const mongoose = require('mongoose');
const logger = require('./logger');
const config = require('./config');

/**
 * Подключение к MongoDB
 */
async function connect() {
  try {
    await mongoose.connect(config.mongo.uri, config.mongo.options);
    logger.info(`Connected to MongoDB at ${config.mongo.uri}`);
    
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
      process.exit(-1);
    });

    // Настройка индексов в моделях
    require('../database/models/user.model');
    require('../database/models/account.model');
    require('../database/models/proxy.model');
    require('../database/models/automation.model');
    
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Закрытие соединения с MongoDB
 */
async function disconnect() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  connect,
  disconnect,
  mongoose,
};