const express = require('express');
const router = express.Router();

// Получение списка всех автоматизаций пользователя
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    data: {
      automations: []
    }
  });
});

// Заглушка для будущей реализации
router.post('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Automation API is under development'
  });
});

module.exports = router;