const dolphinApi = require('./api');
const Account = require('../../database/models/account.model');
const Proxy = require('../../database/models/proxy.model');
const logger = require('../../config/logger');

/**
 * Сервис для управления профилями Dolphin Anty
 */
class DolphinProfilesManager {
  /**
   * Создать профиль для аккаунта Facebook
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @param {string|Object} proxyId - ID прокси или объект прокси (опционально)
   * @return {Promise<Object>} - Созданный профиль Dolphin
   */
  async createProfileForAccount(accountId, proxyId = null) {
    try {
      // Получение полной информации об аккаунте
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId) 
        : accountId;
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      // Получение информации о прокси, если он предоставлен
      let proxy = null;
      if (proxyId) {
        proxy = typeof proxyId === 'string' 
          ? await Proxy.findById(proxyId) 
          : proxyId;
        
        if (!proxy) {
          logger.warn(`Proxy not found: ${proxyId}, continuing without proxy`);
        }
      } else if (account.proxy) {
        // Используем прокси, привязанный к аккаунту, если он есть
        proxy = await Proxy.findById(account.proxy);
      }
      
      // Парсинг cookies, если это еще не сделано
      if (!account.cookieParsed || account.cookieParsed.length === 0) {
        account.parseCookies();
      }
      
      // Создание профиля в Dolphin Anty
      const profile = await dolphinApi.createFacebookProfile(account, proxy);
      
      // Обновление аккаунта с ID профиля Dolphin
      account.dolphinProfileId = profile.id;
      await account.save();
      
      logger.info(`Created Dolphin profile ${profile.id} for account ${account._id}`);
      return profile;
    } catch (error) {
      logger.error(`Error creating Dolphin profile: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Обновить профиль для аккаунта Facebook
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @return {Promise<Object>} - Обновленный профиль Dolphin
   */
  async updateProfileForAccount(accountId) {
    try {
      // Получение полной информации об аккаунте
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId).populate('proxy') 
        : accountId;
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      if (!account.dolphinProfileId) {
        throw new Error(`Account ${account._id} does not have a Dolphin profile`);
      }
      
      // Парсинг cookies, если это еще не сделано
      if (!account.cookieParsed || account.cookieParsed.length === 0) {
        account.parseCookies();
      }
      
      // Обновление cookies в профиле Dolphin
      await dolphinApi.setCookies(account.dolphinProfileId, account.cookieParsed);
      
      // Обновление прокси в профиле Dolphin, если он привязан к аккаунту
      if (account.proxy) {
        const proxy = await Proxy.findById(account.proxy);
        if (proxy) {
          await dolphinApi.setProxy(account.dolphinProfileId, proxy.getDolphinConfig());
        }
      }
      
      // Получение обновленного профиля
      const profile = await dolphinApi.getProfile(account.dolphinProfileId);
      
      logger.info(`Updated Dolphin profile ${profile.id} for account ${account._id}`);
      return profile;
    } catch (error) {
      logger.error(`Error updating Dolphin profile: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Запустить профиль Dolphin для аккаунта
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @param {Object} options - Опции запуска
   * @return {Promise<Object>} - Результат запуска профиля
   */
  async startProfileForAccount(accountId, options = {}) {
    try {
      // Получение полной информации об аккаунте
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId) 
        : accountId;
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      if (!account.dolphinProfileId) {
        // Если профиль не существует, создаем его
        logger.info(`Account ${account._id} does not have a Dolphin profile, creating one`);
        await this.createProfileForAccount(account);
      }
      
      // Запуск профиля
      const result = await dolphinApi.startProfile(account.dolphinProfileId, options);
      
      // Обновление статуса аккаунта
      account.lastUsed = new Date();
      await account.save();
      
      logger.info(`Started Dolphin profile ${account.dolphinProfileId} for account ${account._id}`);
      return result;
    } catch (error) {
      logger.error(`Error starting Dolphin profile: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Остановить профиль Dolphin для аккаунта
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @return {Promise<Object>} - Результат остановки профиля
   */
  async stopProfileForAccount(accountId) {
    try {
      // Получение полной информации об аккаунте
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId) 
        : accountId;
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      if (!account.dolphinProfileId) {
        throw new Error(`Account ${account._id} does not have a Dolphin profile`);
      }
      
      // Остановка профиля
      const result = await dolphinApi.stopProfile(account.dolphinProfileId);
      
      logger.info(`Stopped Dolphin profile ${account.dolphinProfileId} for account ${account._id}`);
      return result;
    } catch (error) {
      logger.error(`Error stopping Dolphin profile: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Удалить профиль Dolphin для аккаунта
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @return {Promise<Object>} - Результат удаления профиля
   */
  async deleteProfileForAccount(accountId) {
    try {
      // Получение полной информации об аккаунте
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId) 
        : accountId;
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      if (!account.dolphinProfileId) {
        throw new Error(`Account ${account._id} does not have a Dolphin profile`);
      }
      
      // Удаление профиля
      const result = await dolphinApi.deleteProfile(account.dolphinProfileId);
      
      // Обновление аккаунта
      account.dolphinProfileId = null;
      await account.save();
      
      logger.info(`Deleted Dolphin profile for account ${account._id}`);
      return result;
    } catch (error) {
      logger.error(`Error deleting Dolphin profile: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Получить статус профиля Dolphin для аккаунта
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @return {Promise<Object>} - Статус профиля
   */
  async getProfileStatusForAccount(accountId) {
    try {
      // Получение полной информации об аккаунте
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId) 
        : accountId;
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      if (!account.dolphinProfileId) {
        return { status: 'not_created' };
      }
      
      // Получение статуса профиля
      const status = await dolphinApi.getProfileStatus(account.dolphinProfileId);
      
      return status;
    } catch (error) {
      logger.error(`Error getting Dolphin profile status: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }
  
  /**
   * Получить или создать профиль Dolphin для аккаунта
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @return {Promise<Object>} - Профиль Dolphin
   */
  async getOrCreateProfileForAccount(accountId) {
    try {
      // Получение полной информации об аккаунте
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId) 
        : accountId;
      
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      // Если профиль уже существует, возвращаем его
      if (account.dolphinProfileId) {
        try {
          const profile = await dolphinApi.getProfile(account.dolphinProfileId);
          return profile;
        } catch (error) {
          // Если профиль не найден в Dolphin, создаем новый
          logger.warn(`Dolphin profile ${account.dolphinProfileId} not found, creating a new one`);
          account.dolphinProfileId = null;
        }
      }
      
      // Создание нового профиля
      return await this.createProfileForAccount(account);
    } catch (error) {
      logger.error(`Error getting or creating Dolphin profile: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DolphinProfilesManager();