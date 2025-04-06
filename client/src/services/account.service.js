import api from './api';

/**
 * Сервис для работы с аккаунтами Facebook
 */
const AccountService = {
  /**
   * Получение списка всех аккаунтов пользователя
   * @param {Object} params - Параметры запроса (page, limit, status, search)
   * @returns {Promise}
   */
  getAllAccounts: (params = {}) => {
    return api.get('/accounts', { params });
  },

  /**
   * Создание нового аккаунта
   * @param {Object} accountData - Данные аккаунта
   * @returns {Promise}
   */
  createAccount: (accountData) => {
    return api.post('/accounts', accountData);
  },

  /**
   * Получение информации об аккаунте по ID
   * @param {string} id - ID аккаунта
   * @returns {Promise}
   */
  getAccount: (id) => {
    return api.get(`/accounts/${id}`);
  },

  /**
   * Обновление аккаунта
   * @param {string} id - ID аккаунта
   * @param {Object} accountData - Новые данные аккаунта
   * @returns {Promise}
   */
  updateAccount: (id, accountData) => {
    return api.put(`/accounts/${id}`, accountData);
  },

  /**
   * Удаление аккаунта
   * @param {string} id - ID аккаунта
   * @returns {Promise}
   */
  deleteAccount: (id) => {
    return api.delete(`/accounts/${id}`);
  },

  /**
   * Проверка статуса аккаунта Facebook
   * @param {string} id - ID аккаунта
   * @returns {Promise}
   */
  checkAccountStatus: (id) => {
    return api.get(`/accounts/${id}/status`);
  },

  /**
   * Обновление cookies аккаунта
   * @param {string} id - ID аккаунта
   * @param {string} cookies - Строка cookies
   * @returns {Promise}
   */
  updateCookies: (id, cookies) => {
    return api.put(`/accounts/${id}/cookies`, { cookies });
  },

  /**
   * Привязка прокси к аккаунту
   * @param {string} id - ID аккаунта
   * @param {string} proxyId - ID прокси
   * @returns {Promise}
   */
  assignProxy: (id, proxyId) => {
    return api.put(`/accounts/${id}/proxy`, { proxyId });
  },

  /**
   * Отвязка прокси от аккаунта
   * @param {string} id - ID аккаунта
   * @returns {Promise}
   */
  removeProxy: (id) => {
    return api.delete(`/accounts/${id}/proxy`);
  },

  /**
   * Создание профиля Dolphin Anty для аккаунта
   * @param {string} id - ID аккаунта
   * @returns {Promise}
   */
  createDolphinProfile: (id) => {
    return api.post(`/accounts/${id}/dolphin-profile`);
  },

  /**
   * Получение статистики аккаунта
   * @param {string} id - ID аккаунта
   * @returns {Promise}
   */
  getAccountStats: (id) => {
    return api.get(`/accounts/${id}/stats`);
  },

  /**
   * Анализ строки cookies для проверки валидности
   * @param {string} cookies - Строка cookies
   * @returns {Object} - Результат анализа
   */
  analyzeCookies: (cookies) => {
    try {
      // Пытаемся распарсить строку cookies как JSON
      const cookiesArray = JSON.parse(cookies);
      
      // Проверяем, является ли результат массивом
      if (!Array.isArray(cookiesArray)) {
        return { valid: false, message: 'Cookies should be a JSON array' };
      }
      
      // Проверяем наличие необходимых полей в каждом объекте cookie
      const hasRequiredFields = cookiesArray.every(cookie => 
        cookie.name && cookie.value && cookie.domain
      );
      
      if (!hasRequiredFields) {
        return { valid: false, message: 'Each cookie should have name, value and domain fields' };
      }
      
      // Ищем основные cookies Facebook
      const hasFacebookCookies = cookiesArray.some(cookie => 
        cookie.name === 'c_user' || cookie.name === 'xs'
      );
      
      if (!hasFacebookCookies) {
        return { valid: false, message: 'Missing essential Facebook cookies (c_user, xs)' };
      }
      
      // Все проверки пройдены
      return { 
        valid: true, 
        cookiesCount: cookiesArray.length,
        domains: [...new Set(cookiesArray.map(c => c.domain))],
        hasLoginCookies: true
      };
    } catch (error) {
      return { valid: false, message: 'Invalid JSON format: ' + error.message };
    }
  }
};

export default AccountService;