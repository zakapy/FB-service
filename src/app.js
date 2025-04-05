const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { errorHandler } = require('./utils/errors');
const logger = require('./config/logger');
const routes = require('./api/routes');
const database = require('./config/database');

// Инициализация приложения
const app = express();

// Подключение к базе данных
database.connect()
  .then(() => logger.info('Database connected successfully'))
  .catch(err => logger.error(`Database connection error: ${err.message}`));

// Настройка middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API маршруты
app.use('/api', routes);

// Обработка ошибок
app.use(errorHandler);

// Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Обработка необработанных promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

module.exports = app;