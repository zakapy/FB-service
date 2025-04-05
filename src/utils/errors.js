/**
 * Класс для обработки ошибок API
 */
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true, stack = '') {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = isOperational;
      
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  /**
   * Обработчик ошибок для middleware Express
   */
  const errorHandler = (err, req, res, next) => {
    // Если уже отправлен ответ, передаем ошибку дальше
    if (res.headersSent) {
      return next(err);
    }
    
    // Определение статуса и сообщения ошибки
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    // Подготовка объекта ошибки для ответа
    const errorResponse = {
      status: 'error',
      statusCode,
      message
    };
    
    // Добавляем стек ошибки в разработке
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
    
    // Логирование ошибки, если доступен логгер
    if (req.app.get('logger')) {
      req.app.get('logger').error(`Error: ${message}`, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: err.stack
      });
    } else {
      console.error('Error:', err);
    }
    
    // Отправка ответа
    res.status(statusCode).json(errorResponse);
  };
  
  module.exports = {
    ApiError,
    errorHandler
  };