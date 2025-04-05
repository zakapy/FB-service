const express = require('express');
const proxyController = require('../controllers/proxy.controller');
const { validate } = require('../middlewares/validator.middleware');
const proxyValidation = require('../validations/proxy.validation');

const router = express.Router();

// Получение списка всех прокси пользователя
router.get('/', proxyController.getAllProxies);

// Создание нового прокси
router.post('/', validate(proxyValidation.createProxy), proxyController.createProxy);

// Получение информации о прокси по ID
router.get('/:id', validate(proxyValidation.getProxy), proxyController.getProxy);

// Обновление прокси
router.put('/:id', validate(proxyValidation.updateProxy), proxyController.updateProxy);

// Удаление прокси
router.delete('/:id', validate(proxyValidation.deleteProxy), proxyController.deleteProxy);

// Проверка прокси на работоспособность
router.post('/:id/check', validate(proxyValidation.checkProxy), proxyController.checkProxy);

// Импорт списка прокси
router.post('/import', validate(proxyValidation.importProxies), proxyController.importProxies);

// Получение списка аккаунтов, использующих прокси
router.get('/:id/accounts', validate(proxyValidation.getProxyAccounts), proxyController.getProxyAccounts);

module.exports = router;