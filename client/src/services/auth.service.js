import api from './api';

/**
 * Сервис для работы с авторизацией
 */
const AuthService = {
  /**
   * Регистрация пользователя
   * @param {Object} userData - Данные пользователя
   * @returns {Promise}
   */
  register: (userData) => {
    return api.post('/auth/register', userData);
  },

  /**
   * Вход в систему
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль пользователя
   * @returns {Promise}
   */
  login: (email, password) => {
    return api.post('/auth/login', { email, password })
      .then(response => {
        if (response.data && response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response;
      });
  },

  /**
   * Выход из системы
   * @returns {Promise}
   */
  logout: () => {
    return api.post('/auth/logout')
      .finally(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  },

  /**
   * Получение профиля текущего пользователя
   * @returns {Promise}
   */
  getProfile: () => {
    return api.get('/auth/me');
  },

  /**
   * Обновление профиля пользователя
   * @param {Object} userData - Данные пользователя для обновления
   * @returns {Promise}
   */
  updateProfile: (userData) => {
    return api.put('/auth/me', userData)
      .then(response => {
        if (response.data && response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response;
      });
  },

  /**
   * Изменение пароля
   * @param {string} currentPassword - Текущий пароль
   * @param {string} newPassword - Новый пароль
   * @returns {Promise}
   */
  changePassword: (currentPassword, newPassword) => {
    return api.put('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Запрос на восстановление пароля
   * @param {string} email - Email пользователя
   * @returns {Promise}
   */
  forgotPassword: (email) => {
    return api.post('/auth/forgot-password', { email });
  },

  /**
   * Сброс пароля
   * @param {string} token - Токен для сброса пароля
   * @param {string} newPassword - Новый пароль
   * @returns {Promise}
   */
  resetPassword: (token, newPassword) => {
    return api.post('/auth/reset-password', { token, newPassword });
  },

  /**
   * Получение текущего пользователя из localStorage
   * @returns {Object|null}
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * Проверка, авторизован ли пользователь
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default AuthService;