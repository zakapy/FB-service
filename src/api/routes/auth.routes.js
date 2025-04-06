const express = require('express');
const authController = require('../../controllers/auth.controller');
const { validate } = require('../../middlewares/validator.middleware');
const authValidation = require('../../api/validations/auth.validation');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

// Регистрация нового пользователя
router.post('/register', validate(authValidation.register), authController.register);

// Авторизация пользователя
router.post('/login', validate(authValidation.login), authController.login);

// Выход из системы
router.post('/logout', authMiddleware, authController.logout);

// Получение информации о текущем пользователе
router.get('/me', authMiddleware, authController.getProfile);

// Обновление информации о пользователе
router.put('/me', authMiddleware, validate(authValidation.updateProfile), authController.updateProfile);

// Изменение пароля
router.put('/change-password', authMiddleware, validate(authValidation.changePassword), authController.changePassword);

// Запрос на восстановление пароля
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);

// Сброс пароля
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);

// Обновление токена доступа
router.post('/refresh-token', validate(authValidation.refreshToken), authController.refreshToken);

module.exports = router;