const axios = require('axios');
const config = require('../../config/config');
const logger = require('../../config/logger');

class DolphinAntyAPI {
  constructor(apiKey = config.dolphinAnty.apiKey, apiUrl = config.dolphinAnty.apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 секунд
    });
    
    // Добавление перехватчиков для логирования
    this.client.interceptors.request.use(request => {
      logger.debug(`Dolphin API Request: ${request.method.toUpperCase()} ${request.baseURL}${request.url}`);
      return request;
    });
    
    this.client.interceptors.response.use(
      response => {
        logger.debug(`Dolphin API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      error => {
        logger.error(`Dolphin API Error: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Получение информации о профиле
   * @param {string} id - ID профиля
   */
  async getProfile(id) {
    try {
      const response = await this.client.get(`/browser_profiles/${id}`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Получение списка всех профилей
   * @param {Object} params - Параметры запроса
   * @param {number} params.page - Номер страницы
   * @param {number} params.limit - Количество элементов на странице
   */
  async getProfiles(params = { page: 1, limit: 50 }) {
    try {
      const response = await this.client.get('/browser_profiles', { params });
      return response.data;
    } catch (error) {
      logger.error(`Error getting profiles: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Создание нового профиля браузера
   * @param {Object} profileData - Данные профиля
   */
  async createProfile(profileData) {
    try {
      const response = await this.client.post('/browser_profiles', profileData);
      return response.data;
    } catch (error) {
      logger.error(`Error creating profile: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Обновление профиля
   * @param {string} id - ID профиля
   * @param {Object} profileData - Данные для обновления
   */
  async updateProfile(id, profileData) {
    try {
      const response = await this.client.patch(`/browser_profiles/${id}`, profileData);
      return response.data;
    } catch (error) {
      logger.error(`Error updating profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Удаление профиля
   * @param {string} id - ID профиля
   */
  async deleteProfile(id) {
    try {
      const response = await this.client.delete(`/browser_profiles/${id}`);
      return response.data;
    } catch (error) {
      logger.error(`Error deleting profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Установка куки в профиль
   * @param {string} id - ID профиля
   * @param {Array} cookies - Массив объектов cookie
   */
  async setCookies(id, cookies) {
    try {
      const response = await this.client.post(`/browser_profiles/${id}/cookies`, { cookies });
      return response.data;
    } catch (error) {
      logger.error(`Error setting cookies for profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Получение куки из профиля
   * @param {string} id - ID профиля
   */
  async getCookies(id) {
    try {
      const response = await this.client.get(`/browser_profiles/${id}/cookies`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting cookies for profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Добавление прокси к профилю
   * @param {string} id - ID профиля
   * @param {Object} proxyData - Данные прокси
   */
  async setProxy(id, proxyData) {
    try {
      const response = await this.client.patch(`/browser_profiles/${id}/proxy`, proxyData);
      return response.data;
    } catch (error) {
      logger.error(`Error setting proxy for profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Запуск профиля в Dolphin Anty
   * @param {string} id - ID профиля
   * @param {Object} options - Опции запуска
   */
  async startProfile(id, options = {}) {
    try {
      const response = await this.client.post(`/browser_profiles/start/${id}`, options);
      return response.data;
    } catch (error) {
      logger.error(`Error starting profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Остановка профиля
   * @param {string} id - ID профиля
   */
  async stopProfile(id) {
    try {
      const response = await this.client.get(`/browser_profiles/stop/${id}`);
      return response.data;
    } catch (error) {
      logger.error(`Error stopping profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Проверка статуса профиля
   * @param {string} id - ID профиля
   */
  async getProfileStatus(id) {
    try {
      const response = await this.client.get(`/browser_profiles/status/${id}`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting status for profile ${id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Создание профиля на основе данных аккаунта Facebook
   * @param {Object} account - Данные аккаунта Facebook
   * @param {Object} proxy - Данные прокси
   */
  async createFacebookProfile(account, proxy = null) {
    try {
      // Базовая конфигурация профиля для Facebook
      const profileData = {
        name: `FB - ${account.name}`,
        tags: ['facebook', 'auto'],
        platform: 'windows', // или 'mac', 'linux'
        browser: 'chrome', // или 'firefox'
        userAgent: null, // Если null, будет использован UA по умолчанию
        webrtc: {
          mode: 'altered' // или 'real', 'disabled'
        },
        timezone: {
          mode: 'auto' // или 'manual'
        },
        geolocation: {
          mode: 'auto' // или 'manual'
        },
        canvas: {
          mode: 'noise' // или 'off', 'real'
        },
        webgl: {
          mode: 'noise' // или 'off', 'real'
        },
        webglInfo: {
          mode: 'noise' // или 'off', 'real'
        },
        audioContext: {
          mode: 'noise' // или 'off', 'real'
        },
        mediaDevices: {
          mode: 'manual', // или 'real'
          audioInputs: 1,
          videoInputs: 1,
          audioOutputs: 1
        },
        ports: {
          mode: 'protect' // или 'off', 'real'
        },
        doNotTrack: false,
        notes: `Аккаунт: ${account.name}, ID: ${account._id}`
      };
      
      // Добавление прокси, если он предоставлен
      if (proxy) {
        profileData.proxy = proxy.getDolphinConfig();
      }
      
      // Создание профиля
      const createdProfile = await this.createProfile(profileData);
      
      // Загрузка cookies в профиль, если они есть у аккаунта
      if (account.cookieParsed && account.cookieParsed.length > 0) {
        await this.setCookies(createdProfile.id, account.cookieParsed);
      }
      
      return createdProfile;
    } catch (error) {
      logger.error(`Error creating Facebook profile for account ${account._id}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DolphinAntyAPI();