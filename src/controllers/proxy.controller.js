const Proxy = require('../../database/models/proxy.model');
const Account = require('../../database/models/account.model');
const { ApiError } = require('../../utils/errors');
const logger = require('../../config/logger');
const axios = require('axios');
const { URL } = require('url');

/**
 * Получение списка всех прокси пользователя
 */
const getAllProxies = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, country, search } = req.query;
    
    // Формирование условий поиска
    const query = { user: req.user._id };
    
    // Фильтр по статусу, если указан
    if (status) {
      query.status = status;
    }
    
    // Фильтр по типу, если указан
    if (type) {
      query.type = type;
    }
    
    // Фильтр по стране, если указана
    if (country) {
      query.country = country;
    }
    
    // Поиск по имени или хосту, если указан поисковый запрос
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { host: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Подсчет общего количества прокси
    const total = await Proxy.countDocuments(query);
    
    // Получение прокси с пагинацией
    const proxies = await Proxy.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Получение количества аккаунтов, использующих каждый прокси
    const proxyData = await Promise.all(proxies.map(async (proxy) => {
      const accountCount = await Account.countDocuments({ proxy: proxy._id });
      const proxyObj = proxy.toJSON();
      proxyObj.accountCount = accountCount;
      return proxyObj;
    }));
    
    res.json({
      status: 'success',
      data: {
        proxies: proxyData,
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
 * Создание нового прокси
 */
const createProxy = async (req, res, next) => {
  try {
    const { name, type, host, port, username, password, country, city, provider, expiresAt, notes, tags } = req.body;
    
    // Создание нового прокси
    const proxy = new Proxy({
      name,
      user: req.user._id,
      type,
      host,
      port,
      username,
      password,
      country,
      city,
      provider,
      expiresAt,
      notes,
      tags,
      status: 'active'
    });
    
    // Сохранение прокси
    await proxy.save();
    
    logger.info(`Proxy created: ${name} by user ${req.user._id}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        proxy: proxy.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение информации о прокси по ID
 */
const getProxy = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск прокси, принадлежащего текущему пользователю
    const proxy = await Proxy.findOne({ _id: id, user: req.user._id });
    
    if (!proxy) {
      throw new ApiError(404, 'Proxy not found or does not belong to user');
    }
    
    // Получение количества аккаунтов, использующих прокси
    const accountCount = await Account.countDocuments({ proxy: proxy._id });
    
    // Получение списка аккаунтов, использующих прокси (только имена)
    const accounts = await Account.find({ proxy: proxy._id }).select('name status');
    
    const proxyData = proxy.toJSON();
    proxyData.accountCount = accountCount;
    proxyData.accounts = accounts;
    
    res.json({
      status: 'success',
      data: {
        proxy: proxyData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление прокси
 */
const updateProxy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, host, port, username, password, country, city, provider, expiresAt, notes, tags, status } = req.body;
    
    // Поиск прокси, принадлежащего текущему пользователю
    const proxy = await Proxy.findOne({ _id: id, user: req.user._id });
    
    if (!proxy) {
      throw new ApiError(404, 'Proxy not found or does not belong to user');
    }
    
    // Обновление полей прокси
    if (name !== undefined) proxy.name = name;
    if (type !== undefined) proxy.type = type;
    if (host !== undefined) proxy.host = host;
    if (port !== undefined) proxy.port = port;
    if (username !== undefined) proxy.username = username;
    if (password !== undefined) proxy.password = password;
    if (country !== undefined) proxy.country = country;
    if (city !== undefined) proxy.city = city;
    if (provider !== undefined) proxy.provider = provider;
    if (expiresAt !== undefined) proxy.expiresAt = expiresAt;
    if (notes !== undefined) proxy.notes = notes;
    if (tags !== undefined) proxy.tags = tags;
    if (status !== undefined) proxy.status = status;
    
    // Сохранение прокси
    await proxy.save();
    
    logger.info(`Proxy updated: ${proxy.name} by user ${req.user._id}`);
    
    // Обновление профилей Dolphin Anty для всех связанных аккаунтов
    if (host !== undefined || port !== undefined || username !== undefined || password !== undefined || type !== undefined) {
      updateDolphinProfilesForProxy(proxy._id);
    }
    
    res.json({
      status: 'success',
      data: {
        proxy: proxy.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Удаление прокси
 */
const deleteProxy = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск прокси, принадлежащего текущему пользователю
    const proxy = await Proxy.findOne({ _id: id, user: req.user._id });
    
    if (!proxy) {
      throw new ApiError(404, 'Proxy not found or does not belong to user');
    }
    
    // Проверка, используется ли прокси какими-либо аккаунтами
    const accountCount = await Account.countDocuments({ proxy: proxy._id });
    
    if (accountCount > 0 && !req.query.force) {
      throw new ApiError(400, `Cannot delete proxy used by ${accountCount} accounts. Set 'force=true' to remove proxy anyway.`);
    }
    
    // Если есть аккаунты, использующие этот прокси, и указан параметр force, отвязываем прокси
    if (accountCount > 0 && req.query.force === 'true') {
      await Account.updateMany({ proxy: proxy._id }, { $set: { proxy: null } });
      logger.info(`Proxy ${proxy.name} detached from ${accountCount} accounts`);
    }
    
    // Удаление прокси
    await proxy.remove();
    
    logger.info(`Proxy deleted: ${proxy.name} by user ${req.user._id}`);
    
    res.json({
      status: 'success',
      message: 'Proxy deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Проверка прокси на работоспособность
 */
const checkProxy = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск прокси, принадлежащего текущему пользователю
    const proxy = await Proxy.findOne({ _id: id, user: req.user._id });
    
    if (!proxy) {
      throw new ApiError(404, 'Proxy not found or does not belong to user');
    }
    
    // Проверка прокси с помощью запроса к API проверки IP
    const proxyConfig = proxy.getPlaywrightConfig();
    const proxyUrl = `${proxyConfig.type}://${proxyConfig.username ? `${proxyConfig.username}:${proxyConfig.password}@` : ''}${proxyConfig.server}`;
    
    let startTime = Date.now();
    let proxyIp = null;
    let isWorking = false;
    let error = null;
    
    try {
      // Настройка axios для использования прокси
      const axiosConfig = {
        proxy: {
          host: new URL(proxyUrl).hostname,
          port: parseInt(new URL(proxyUrl).port),
          protocol: new URL(proxyUrl).protocol.slice(0, -1),
          auth: proxyConfig.username ? {
            username: proxyConfig.username,
            password: proxyConfig.password
          } : undefined
        },
        timeout: 15000 // 15 секунд на выполнение запроса
      };
      
      // Запрос к API проверки IP
      const response = await axios.get('https://api.ipify.org?format=json', axiosConfig);
      
      const endTime = Date.now();
      const pingTime = endTime - startTime;
      
      if (response.data && response.data.ip) {
        proxyIp = response.data.ip;
        isWorking = true;
        
        // Обновление информации о прокси
        proxy.lastChecked = new Date();
        proxy.lastIp = proxyIp;
        proxy.ping = pingTime;
        proxy.status = 'active';
        await proxy.save();
      }
    } catch (checkError) {
      error = checkError.message;
      
      // Обновление статуса прокси
      proxy.lastChecked = new Date();
      proxy.status = 'error';
      await proxy.save();
    }
    
    logger.info(`Proxy check: ${proxy.name}, working: ${isWorking}, IP: ${proxyIp || 'unknown'}`);
    
    res.json({
      status: 'success',
      data: {
        isWorking,
        ip: proxyIp,
        ping: proxy.ping,
        error: error,
        checkedAt: proxy.lastChecked
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Импорт списка прокси
 */
const importProxies = async (req, res, next) => {
  try {
    const { proxies, defaultType, defaultProvider, defaultTags } = req.body;
    
    if (!Array.isArray(proxies) || proxies.length === 0) {
      throw new ApiError(400, 'Invalid proxies array');
    }
    
    const importedProxies = [];
    const errors = [];
    
    // Обработка каждого прокси из списка
    for (let i = 0; i < proxies.length; i++) {
      try {
        const proxyData = proxies[i];
        
        // Парсинг строки прокси, если она передана в формате host:port:username:password
        let host, port, username, password, type, name;
        
        if (typeof proxyData === 'string') {
          const parts = proxyData.split(':');
          
          if (parts.length < 2) {
            throw new Error('Invalid proxy format');
          }
          
          host = parts[0];
          port = parseInt(parts[1]);
          username = parts.length > 2 ? parts[2] : null;
          password = parts.length > 3 ? parts[3] : null;
          type = defaultType || 'http';
          name = `${host}:${port}`;
        } else {
          // Если передан объект, используем его поля
          host = proxyData.host;
          port = proxyData.port;
          username = proxyData.username;
          password = proxyData.password;
          type = proxyData.type || defaultType || 'http';
          name = proxyData.name || `${host}:${port}`;
        }
        
        // Проверка обязательных полей
        if (!host || !port) {
          throw new Error('Missing host or port');
        }
        
        // Создание нового прокси
        const proxy = new Proxy({
          name,
          user: req.user._id,
          type,
          host,
          port,
          username,
          password,
          provider: defaultProvider,
          tags: defaultTags,
          status: 'active'
        });
        
        // Сохранение прокси
        await proxy.save();
        
        importedProxies.push(proxy);
      } catch (error) {
        errors.push({
          index: i,
          proxy: proxies[i],
          error: error.message
        });
      }
    }
    
    logger.info(`Imported ${importedProxies.length} proxies for user ${req.user._id}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        imported: importedProxies.length,
        total: proxies.length,
        errors: errors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение списка аккаунтов, использующих прокси
 */
const getProxyAccounts = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Поиск прокси, принадлежащего текущему пользователю
    const proxy = await Proxy.findOne({ _id: id, user: req.user._id });
    
    if (!proxy) {
      throw new ApiError(404, 'Proxy not found or does not belong to user');
    }
    
    // Получение списка аккаунтов, использующих прокси
    const accounts = await Account.find({ proxy: proxy._id });
    
    res.json({
      status: 'success',
      data: {
        accounts,
        total: accounts.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Вспомогательная функция для обновления профилей Dolphin Anty, связанных с прокси
 */
const updateDolphinProfilesForProxy = async (proxyId) => {
  try {
    const dolphinProfiles = require('../../automation/dolphin/profiles');
    
    // Находим все аккаунты, использующие этот прокси
    const accounts = await Account.find({ proxy: proxyId });
    
    if (accounts.length === 0) {
      return;
    }
    
    logger.info(`Updating Dolphin profiles for ${accounts.length} accounts using proxy ${proxyId}`);
    
    // Обновляем профили Dolphin для каждого аккаунта
    for (const account of accounts) {
      if (account.dolphinProfileId) {
        try {
          await dolphinProfiles.updateProfileForAccount(account);
          logger.info(`Updated Dolphin profile for account ${account._id}`);
        } catch (error) {
          logger.error(`Error updating Dolphin profile for account ${account._id}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error updating Dolphin profiles for proxy ${proxyId}: ${error.message}`);
  }
};

module.exports = {
  getAllProxies,
  createProxy,
  getProxy,
  updateProxy,
  deleteProxy,
  checkProxy,
  importProxies,
  getProxyAccounts
};