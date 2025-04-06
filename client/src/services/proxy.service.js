import api from './api';

/**
 * Сервис для работы с прокси
 */
const ProxyService = {
  /**
   * Получение списка всех прокси пользователя
   * @param {Object} params - Параметры запроса (page, limit, status, type, country, search)
   * @returns {Promise}
   */
  getAllProxies: (params = {}) => {
    return api.get('/proxies', { params });
  },

  /**
   * Создание нового прокси
   * @param {Object} proxyData - Данные прокси
   * @returns {Promise}
   */
  createProxy: (proxyData) => {
    return api.post('/proxies', proxyData);
  },

  /**
   * Получение информации о прокси по ID
   * @param {string} id - ID прокси
   * @returns {Promise}
   */
  getProxy: (id) => {
    return api.get(`/proxies/${id}`);
  },

  /**
   * Обновление прокси
   * @param {string} id - ID прокси
   * @param {Object} proxyData - Новые данные прокси
   * @returns {Promise}
   */
  updateProxy: (id, proxyData) => {
    return api.put(`/proxies/${id}`, proxyData);
  },

  /**
   * Удаление прокси
   * @param {string} id - ID прокси
   * @param {boolean} force - Флаг принудительного удаления
   * @returns {Promise}
   */
  deleteProxy: (id, force = false) => {
    return api.delete(`/proxies/${id}`, { params: { force } });
  },

  /**
   * Проверка прокси на работоспособность
   * @param {string} id - ID прокси
   * @returns {Promise}
   */
  checkProxy: (id) => {
    return api.post(`/proxies/${id}/check`);
  },

  /**
   * Импорт списка прокси
   * @param {Array} proxies - Массив прокси для импорта
   * @param {Object} options - Дополнительные опции
   * @returns {Promise}
   */
  importProxies: (proxies, options = {}) => {
    return api.post('/proxies/import', {
      proxies,
      defaultType: options.defaultType,
      defaultProvider: options.defaultProvider,
      defaultTags: options.defaultTags
    });
  },

  /**
   * Получение списка аккаунтов, использующих прокси
   * @param {string} id - ID прокси
   * @returns {Promise}
   */
  getProxyAccounts: (id) => {
    return api.get(`/proxies/${id}/accounts`);
  },

  /**
   * Анализ строки с прокси для импорта
   * @param {string} proxyString - Строка с данными прокси
   * @returns {Array} - Массив объектов прокси
   */
  parseProxyString: (proxyString) => {
    if (!proxyString) return [];

    // Разделяем строку на строки
    const lines = proxyString.split(/[\r\n]+/).filter(line => line.trim());

    // Парсим каждую строку
    return lines.map((line, index) => {
      const parts = line.trim().split(/[:\s]+/);
      
      if (parts.length < 2) {
        return { error: 'Invalid format', line };
      }

      // Базовый формат: host:port или host:port:username:password
      const proxy = {
        name: `Proxy ${index + 1}`,
        host: parts[0],
        port: parseInt(parts[1]),
        type: 'http'
      };

      // Если есть данные для авторизации
      if (parts.length >= 4) {
        proxy.username = parts[2];
        proxy.password = parts[3];
      }

      return proxy;
    });
  },

  /**
   * Проверка прокси без сохранения
   * @param {string} host - Хост прокси
   * @param {number} port - Порт прокси
   * @param {string} type - Тип прокси
   * @param {string} username - Имя пользователя (опционально)
   * @param {string} password - Пароль (опционально)
   * @returns {Promise}
   */
  testProxy: (host, port, type = 'http', username = '', password = '') => {
    return api.post('/proxies/test', {
      host,
      port,
      type,
      username,
      password
    });
  }
};

export default ProxyService;