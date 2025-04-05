const winston = require('winston');
const path = require('path');
const config = require('./config');

// Определение форматов логов
const formats = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Создание папки для логов, если она не существует
const logDir = path.join(process.cwd(), 'logs');
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Создание логгера
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: formats,
  defaultMeta: { service: 'fb-automation' },
  transports: [
    // Запись логов в файл
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, config.logging.file || 'app.log')
    })
  ]
});

// Если не в производственном режиме, добавляем вывод в консоль
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;