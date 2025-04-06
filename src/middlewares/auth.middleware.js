const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/errors');
const config = require('../config/config');
const User = require('../database/models/user.model');
const logger = require('../config/logger');

/**
 * Middleware для проверки авторизации
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Получение токена из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Верификация токена
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token expired');
      }
      
      throw new ApiError(401, 'Invalid token');
    }
    
    // Проверка существования пользователя
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new ApiError(401, 'User not found');
    }
    
    // Проверка, активен ли пользователь
    if (!user.isActive) {
      throw new ApiError(403, 'User is not active');
    }
    
    // Добавление пользователя в объект запроса
    req.user = user;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware для проверки роли администратора
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin privileges required'));
  }
  
  next();
};

/**
 * Middleware для логирования запросов
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Логирование начала запроса
  logger.info(`${req.method} ${req.originalUrl} [STARTED]`);
  
  // После завершения запроса
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info(`${req.method} ${req.originalUrl} [COMPLETED] ${res.statusCode} in ${duration}ms`);
  });
  
  // В случае ошибки
  res.on('error', (error) => {
    const duration = Date.now() - start;
    
    logger.error(`${req.method} ${req.originalUrl} [ERROR] ${error.message} in ${duration}ms`);
  });
  
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  requestLogger
};