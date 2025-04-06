const express = require('express');
const authRoutes = require('./auth.routes');
const accountRoutes = require('./account.rountes');
const proxyRoutes = require('./proxy.routes');
const automationRoutes = require('./automation.routes');
const { authMiddleware } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Базовый маршрут для проверки статуса API
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Регистрация маршрутов
router.use('/auth', authRoutes);
router.use('/accounts', authMiddleware, accountRoutes);
router.use('/proxies', authMiddleware, proxyRoutes);
router.use('/automation', authMiddleware, automationRoutes);

module.exports = router;