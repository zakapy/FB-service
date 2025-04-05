const express = require('express');
const accountController = require('../../controllers/account.controller');
const { validate } = require('../../middlewares/validator.middleware');
const accountValidation = require('../validations/account.validation');

const router = express.Router();

// Получение списка всех аккаунтов пользователя
router.get('/', accountController.getAllAccounts);

// Создание нового аккаунта
router.post('/', validate(accountValidation.createAccount), accountController.createAccount);

// Получение информации об аккаунте по ID
router.get('/:id', validate(accountValidation.getAccount), accountController.getAccount);

// Обновление аккаунта
router.put('/:id', validate(accountValidation.updateAccount), accountController.updateAccount);

// Удаление аккаунта
router.delete('/:id', validate(accountValidation.deleteAccount), accountController.deleteAccount);

// Проверка статуса аккаунта Facebook
router.get('/:id/status', validate(accountValidation.checkStatus), accountController.checkAccountStatus);

// Обновление cookies аккаунта
router.put('/:id/cookies', validate(accountValidation.updateCookies), accountController.updateCookies);

// Привязка прокси к аккаунту
router.put('/:id/proxy', validate(accountValidation.assignProxy), accountController.assignProxy);

// Отвязка прокси от аккаунта
router.delete('/:id/proxy', validate(accountValidation.removeProxy), accountController.removeProxy);

// Создание профиля Dolphin Anty для аккаунта
router.post('/:id/dolphin-profile', validate(accountValidation.createDolphinProfile), accountController.createDolphinProfile);

// Получение статистики аккаунта
router.get('/:id/stats', validate(accountValidation.getStats), accountController.getAccountStats);

module.exports = router;