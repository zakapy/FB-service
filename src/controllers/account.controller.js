const Account = require('../../database/models/account.model');
const Proxy = require('../../database/models/proxy.model');
const { ApiError } = require('../../utils/errors');
const logger = require('../../config/logger');
const dolphinProfiles = require('../../automation/dolphin/profiles');
const browser = require('../../automation/playwright/browser');

/**
 * Получение списка всех аккаунтов пользователя
 */
const getAllAccounts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    // Формирование условий поиска
    const query = { user: req.user._id };
    
    // Фильтр по статусу, если указан
    if (status) {
      query.status = status;
    }
    
    // Поиск по имени или email, если указан поисковый запрос
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'emailAccess.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Подсчет общего количества аккаунтов
    const total = await Account.countDocuments(query);
    
    // Получение аккаунтов с пагинацией
    const accounts = await Account.find(query)
      .populate('proxy', 'name host port type status country')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    res.json({
      status: 'success',
      data: {
        accounts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Создание нового аккаунта
 */
const createAccount = async (req, res, next) => {
  try {
    const { name, cookies, proxyId, emailAccess, notes } = req.body;
    
    // Проверка, существует ли прокси, если он указан
    let proxy = null;
    if (proxyId) {
      proxy = await Proxy.findOne({ _id: proxyId, user: req.user._id });
      if (!proxy) {
        throw new ApiError(404, 'Proxy not found or does not belong to user');
      }
    }
    
    // Создание нового аккаунта
    const account = new Account({
      name,
      user: req.user._id,
      cookies,
      proxy: proxyId || null,
      emailAccess,
      notes
    });
    
    // Если предоставлены cookies, парсим их
    if (cookies) {
      account.parseCookies();
    }
    
    // Сохранение аккаунта
    await account.save();
    
    // Создание профиля Dolphin Anty, если это необходимо
    // Это можно сделать асинхронно, чтобы не задерживать ответ
    if (req.body.createDolphinProfile) {
      dolphinProfiles.createProfileForAccount(account._id, proxyId)
        .then(profile => {
          logger.info(`Created Dolphin profile for account ${account._id}: ${profile.id}`);
        })
        .catch(error => {
          logger.error(`Error creating Dolphin profile for account ${account._id}: ${error.message}`);
        });
    }
    
    logger.info(`Account created: ${name} by user ${req.user._id}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение информации об аккаунте по ID
 */
const getAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id })
      .populate('proxy', 'name host port type status country');
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    res.json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление аккаунта
 */
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, cookies, proxyId, emailAccess, notes, status } = req.body;
    
    // Проверка, существует ли прокси, если он указан
    if (proxyId) {
      const proxy = await Proxy.findOne({ _id: proxyId, user: req.user._id });
      if (!proxy) {
        throw new ApiError(404, 'Proxy not found or does not belong to user');
      }
    }
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    let account = await Account.findOne({ _id: id, user: req.user._id });
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Обновление полей аккаунта
    if (name !== undefined) account.name = name;
    if (cookies !== undefined) account.cookies = cookies;
    if (proxyId !== undefined) account.proxy = proxyId || null;
    if (emailAccess !== undefined) account.emailAccess = emailAccess;
    if (notes !== undefined) account.notes = notes;
    if (status !== undefined) account.status = status;
    
    // Если обновлены cookies, парсим их
    if (cookies !== undefined) {
      account.parseCookies();
    }
    
    // Сохранение аккаунта
    await account.save();
    
    // Обновление профиля Dolphin Anty, если он существует
    if (account.dolphinProfileId) {
      dolphinProfiles.updateProfileForAccount(account._id)
        .then(() => {
          logger.info(`Updated Dolphin profile for account ${account._id}`);
        })
        .catch(error => {
          logger.error(`Error updating Dolphin profile for account ${account._id}: ${error.message}`);
        });
    }
    
    logger.info(`Account updated: ${account.name} by user ${req.user._id}`);
    
    // Получаем обновленный аккаунт с данными о прокси
    account = await Account.findById(id).populate('proxy', 'name host port type status country');
    
    res.json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Удаление аккаунта
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id });
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Удаление профиля Dolphin Anty, если он существует
    if (account.dolphinProfileId) {
      dolphinProfiles.deleteProfileForAccount(account._id)
        .then(() => {
          logger.info(`Deleted Dolphin profile for account ${account._id}`);
        })
        .catch(error => {
          logger.error(`Error deleting Dolphin profile for account ${account._id}: ${error.message}`);
        });
    }
    
    // Удаление аккаунта
    await account.remove();
    
    logger.info(`Account deleted: ${account.name} by user ${req.user._id}`);
    
    res.json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Проверка статуса аккаунта Facebook
 */
const checkAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id });
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Проверка аутентификации аккаунта в Facebook
    const isLoggedIn = await browser.checkFacebookAuth(account._id);
    
    // Обновление статуса аккаунта в базе данных
    if (!isLoggedIn && account.status === 'active') {
      account.status = 'inactive';
      await account.save();
      logger.info(`Account status changed to inactive: ${account.name}`);
    } else if (isLoggedIn && account.status === 'inactive') {
      account.status = 'active';
      await account.save();
      logger.info(`Account status changed to active: ${account.name}`);
    }
    
    res.json({
      status: 'success',
      data: {
        isLoggedIn,
        accountStatus: account.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление cookies аккаунта
 */
const updateCookies = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cookies } = req.body;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id });
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Обновление cookies
    account.cookies = cookies;
    account.parseCookies();
    
    // Сохранение аккаунта
    await account.save();
    
    // Обновление профиля Dolphin Anty, если он существует
    if (account.dolphinProfileId) {
      dolphinProfiles.updateProfileForAccount(account._id)
        .then(() => {
          logger.info(`Updated cookies in Dolphin profile for account ${account._id}`);
        })
        .catch(error => {
          logger.error(`Error updating cookies in Dolphin profile for account ${account._id}: ${error.message}`);
        });
    }
    
    logger.info(`Account cookies updated: ${account.name} by user ${req.user._id}`);
    
    res.json({
      status: 'success',
      message: 'Cookies updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Привязка прокси к аккаунту
 */
const assignProxy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { proxyId } = req.body;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id });
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Проверка, существует ли прокси
    const proxy = await Proxy.findOne({ _id: proxyId, user: req.user._id });
    
    if (!proxy) {
      throw new ApiError(404, 'Proxy not found or does not belong to user');
    }
    
    // Привязка прокси к аккаунту
    account.proxy = proxyId;
    await account.save();
    
    // Обновление профиля Dolphin Anty, если он существует
    if (account.dolphinProfileId) {
      dolphinProfiles.updateProfileForAccount(account._id)
        .then(() => {
          logger.info(`Updated proxy in Dolphin profile for account ${account._id}`);
        })
        .catch(error => {
          logger.error(`Error updating proxy in Dolphin profile for account ${account._id}: ${error.message}`);
        });
    }
    
    logger.info(`Proxy assigned to account: ${account.name}, proxy: ${proxy.name}`);
    
    res.json({
      status: 'success',
      data: {
        account: await Account.findById(id).populate('proxy', 'name host port type status country')
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Отвязка прокси от аккаунта
 */
const removeProxy = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id });
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Отвязка прокси от аккаунта
    account.proxy = null;
    await account.save();
    
    // Обновление профиля Dolphin Anty, если он существует
    if (account.dolphinProfileId) {
      dolphinProfiles.updateProfileForAccount(account._id)
        .then(() => {
          logger.info(`Removed proxy from Dolphin profile for account ${account._id}`);
        })
        .catch(error => {
          logger.error(`Error removing proxy from Dolphin profile for account ${account._id}: ${error.message}`);
        });
    }
    
    logger.info(`Proxy removed from account: ${account.name}`);
    
    res.json({
      status: 'success',
      message: 'Proxy removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Создание профиля Dolphin Anty для аккаунта
 */
const createDolphinProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id }).populate('proxy');
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Проверка, существует ли уже профиль Dolphin Anty
    if (account.dolphinProfileId) {
      const profileStatus = await dolphinProfiles.getProfileStatusForAccount(account);
      
      if (profileStatus.status !== 'error' && profileStatus.status !== 'not_created') {
        throw new ApiError(400, 'Dolphin profile already exists for this account');
      }
    }
    
    // Создание профиля Dolphin Anty
    const profile = await dolphinProfiles.createProfileForAccount(account);
    
    logger.info(`Dolphin profile created for account: ${account.name}, profile ID: ${profile.id}`);
    
    res.json({
      status: 'success',
      data: {
        dolphinProfileId: profile.id,
        profileName: profile.name
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение статистики аккаунта
 */
const getAccountStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск аккаунта, принадлежащего текущему пользователю
    const account = await Account.findOne({ _id: id, user: req.user._id });
    
    if (!account) {
      throw new ApiError(404, 'Account not found or does not belong to user');
    }
    
    // Получение статистики аккаунта
    const stats = account.stats;
    
    // Получение информации об автоматизациях, связанных с аккаунтом
    const automationStats = await getAccountAutomationStats(id);
    
    res.json({
      status: 'success',
      data: {
        stats,
        automationStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Вспомогательная функция для получения статистики автоматизаций аккаунта
 */
const getAccountAutomationStats = async (accountId) => {
  // Подключаем модель Automation
  const Automation = require('../../database/models/automation.model');
  
  // Находим все автоматизации, связанные с аккаунтом
  const automations = await Automation.find({ accounts: accountId });
  
  // Подсчитываем статистику
  const totalAutomations = automations.length;
  const activeAutomations = automations.filter(a => a.active).length;
  const completedAutomations = automations.filter(a => a.currentStatus === 'completed').length;
  const failedAutomations = automations.filter(a => a.currentStatus === 'failed').length;
  
  // Подсчитываем общее количество действий
  let totalActions = 0;
  automations.forEach(automation => {
    if (automation.lastRun && automation.lastRun.actionsPerformed) {
      totalActions += automation.lastRun.actionsPerformed;
    }
  });
  
  return {
    totalAutomations,
    activeAutomations,
    completedAutomations,
    failedAutomations,
    totalActions
  };
};

module.exports = {
  getAllAccounts,
  createAccount,
  getAccount,
  updateAccount,
  deleteAccount,
  checkAccountStatus,
  updateCookies,
  assignProxy,
  removeProxy,
  createDolphinProfile,
  getAccountStats
};