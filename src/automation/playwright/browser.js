const { chromium } = require('playwright');
const logger = require('../../config/logger');
const config = require('../../config/config');
const Proxy = require('../../database/models/proxy.model');
const Account = require('../../database/models/account.model');
const dolphinProfiles = require('../dolphin/profiles');

/**
 * Сервис для работы с браузером через Playwright, интегрированный с Dolphin Anty
 */
class PlaywrightBrowser {
  constructor() {
    this.browsers = new Map(); // Хранит экземпляры браузеров для каждого аккаунта
    this.contexts = new Map(); // Хранит контексты браузеров для каждого аккаунта
    this.pages = new Map(); // Хранит открытые страницы для каждого аккаунта
    this.activeSessions = new Map(); // Хранит информацию о сессии Dolphin Anty
  }
  
  /**
   * Получение или создание экземпляра браузера для аккаунта
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @param {Object} options - Опции для запуска браузера
   * @returns {Promise<Object>} - Объект с браузером, контекстом и страницей
   */
  async getBrowserForAccount(accountId, options = {}) {
    try {
      const accountKey = typeof accountId === 'string' ? accountId : accountId._id.toString();
      
      // Получаем полную информацию об аккаунте, если передан только ID
      const account = typeof accountId === 'string' 
        ? await Account.findById(accountId).populate('proxy')
        : accountId;
        
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }
      
      // Проверяем, существует ли уже экземпляр браузера для этого аккаунта
      if (this.browsers.has(accountKey) && 
          this.contexts.has(accountKey) && 
          this.pages.has(accountKey)) {
        
        try {
          // Проверяем, не закрыта ли страница
          const page = this.pages.get(accountKey);
          await page.evaluate(() => document.title); // Простой способ проверить, активна ли страница
          
          return {
            browser: this.browsers.get(accountKey),
            context: this.contexts.get(accountKey),
            page: this.pages.get(accountKey)
          };
        } catch (error) {
          // Если страница или контекст уже закрыты, создаем новые
          logger.info(`Browser session for account ${accountKey} is not active, creating a new one`);
          await this.closeBrowserForAccount(accountKey);
        }
      }
      
      // Запуск браузера через Dolphin Anty
      let dolphinSession = null;
      
      if (account.dolphinProfileId) {
        try {
          // Запускаем профиль в Dolphin Anty
          const statusResult = await dolphinProfiles.getProfileStatusForAccount(account);
          
          if (statusResult.status !== 'active') {
            logger.info(`Starting Dolphin profile for account ${accountKey}`);
            dolphinSession = await dolphinProfiles.startProfileForAccount(account, {
              automation: true // Режим автоматизации
            });
          } else {
            logger.info(`Dolphin profile for account ${accountKey} is already active`);
            dolphinSession = statusResult;
          }
          
          // Подключаемся к браузеру через CDP endpoint
          const browser = await chromium.connectOverCDP({
            endpointURL: dolphinSession.ws.puppeteer,
            ...options.browserOptions
          });
          
          // Сохраняем информацию о сессии
          this.activeSessions.set(accountKey, dolphinSession);
          this.browsers.set(accountKey, browser);
          
          // Получаем уже открытый контекст и страницу
          const [context] = browser.contexts();
          const [page] = await context.pages();
          
          this.contexts.set(accountKey, context);
          this.pages.set(accountKey, page);
          
          return { browser, context, page };
        } catch (error) {
          logger.error(`Error connecting to Dolphin browser: ${error.message}`);
          logger.info('Falling back to direct Playwright browser launch');
          // Если не удалось подключиться через Dolphin, используем прямой запуск
        }
      }
      
      // Прямой запуск браузера через Playwright (если Dolphin недоступен или не настроен)
      logger.info(`Launching browser directly for account ${accountKey}`);
      
      // Настройка прокси, если есть
      let proxy = null;
      if (account.proxy) {
        proxy = await Proxy.findById(account.proxy);
      }
      
      // Конфигурация для запуска браузера
      const launchOptions = {
        headless: options.headless !== undefined ? options.headless : true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-site-isolation-trials'
        ],
        ...options.browserOptions
      };
      
      // Запуск браузера
      const browser = await chromium.launch(launchOptions);
      this.browsers.set(accountKey, browser);
      
      // Создание контекста браузера
      const contextOptions = {
        viewport: { width: 1280, height: 800 },
        userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        javaScriptEnabled: true,
        ...options.contextOptions
      };
      
      // Добавляем прокси в контекст, если он есть
      if (proxy) {
        contextOptions.proxy = proxy.getPlaywrightConfig();
      }
      
      const context = await browser.newContext(contextOptions);
      this.contexts.set(accountKey, context);
      
      // Настройка перехвата сетевых запросов для эмуляции человеческого поведения
      await context.route('**/*', route => {
        // Случайная задержка для имитации человеческого поведения
        const randomDelay = Math.floor(Math.random() * 100);
        setTimeout(() => route.continue(), randomDelay);
      });
      
      // Загрузка cookies аккаунта, если они есть
      try {
        const cookies = account.parseCookies();
        if (cookies && cookies.length > 0) {
          await context.addCookies(cookies);
        }
      } catch (error) {
        logger.warn(`Failed to load cookies for account ${accountKey}: ${error.message}`);
      }
      
      // Создание новой страницы
      const page = await context.newPage();
      this.pages.set(accountKey, page);
      
      // Добавляем обработчики для страницы
      await this._setupPageHandlers(page, accountKey);
      
      return { browser, context, page };
    } catch (error) {
      logger.error(`Error getting browser for account ${accountId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Настройка обработчиков событий для страницы
   * @param {Page} page - Экземпляр страницы Playwright
   * @param {string} accountKey - Ключ аккаунта
   * @private
   */
  async _setupPageHandlers(page, accountKey) {
    // Обработка диалоговых окон (alert, confirm, prompt)
    page.on('dialog', async dialog => {
      logger.info(`Dialog appeared for account ${accountKey}: ${dialog.type()} - ${dialog.message()}`);
      // По умолчанию принимаем все диалоги
      await dialog.accept();
    });
    
    // Обработка ошибок JavaScript на странице
    page.on('pageerror', error => {
      logger.warn(`Page error for account ${accountKey}: ${error.message}`);
    });
    
    // Обработка консольных сообщений
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logger.warn(`Console error for account ${accountKey}: ${msg.text()}`);
      }
    });
    
    // Обработка событий навигации
    page.on('load', () => {
      logger.debug(`Page loaded for account ${accountKey}: ${page.url()}`);
    });
    
    // Обработка файловых загрузок
    page.on('filechooser', async fileChooser => {
      logger.info(`File chooser triggered for account ${accountKey}`);
      // По умолчанию не загружаем никаких файлов
      await fileChooser.cancel();
    });
  }
  
  /**
   * Закрытие браузера для аккаунта
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   */
  async closeBrowserForAccount(accountId) {
    try {
      const accountKey = typeof accountId === 'string' ? accountId : accountId._id.toString();
      
      // Сохраняем cookies перед закрытием, если страница активна
      if (this.pages.has(accountKey)) {
        try {
          const page = this.pages.get(accountKey);
          const context = this.contexts.get(accountKey);
          
          // Проверяем, что страница открыта
          await page.evaluate(() => document.title);
          
          // Сохраняем cookies
          const cookies = await context.cookies();
          if (cookies && cookies.length > 0) {
            const account = await Account.findById(accountKey);
            if (account) {
              account.cookies = JSON.stringify(cookies);
              await account.save();
              logger.info(`Saved cookies for account ${accountKey}`);
            }
          }
        } catch (error) {
          logger.warn(`Could not save cookies for account ${accountKey}: ${error.message}`);
        }
      }
      
      // Закрываем страницу
      if (this.pages.has(accountKey)) {
        try {
          await this.pages.get(accountKey).close();
        } catch (error) {
          logger.warn(`Error closing page for account ${accountKey}: ${error.message}`);
        }
        this.pages.delete(accountKey);
      }
      
      // Закрываем контекст
      if (this.contexts.has(accountKey)) {
        try {
          await this.contexts.get(accountKey).close();
        } catch (error) {
          logger.warn(`Error closing context for account ${accountKey}: ${error.message}`);
        }
        this.contexts.delete(accountKey);
      }
      
      // Закрываем браузер
      if (this.browsers.has(accountKey)) {
        try {
          await this.browsers.get(accountKey).close();
        } catch (error) {
          logger.warn(`Error closing browser for account ${accountKey}: ${error.message}`);
        }
        this.browsers.delete(accountKey);
      }
      
      // Остановка сессии Dolphin Anty, если она активна
      if (this.activeSessions.has(accountKey)) {
        try {
          const account = await Account.findById(accountKey);
          if (account && account.dolphinProfileId) {
            await dolphinProfiles.stopProfileForAccount(account);
          }
        } catch (error) {
          logger.warn(`Error stopping Dolphin session for account ${accountKey}: ${error.message}`);
        }
        this.activeSessions.delete(accountKey);
      }
      
      logger.info(`Browser closed for account ${accountKey}`);
    } catch (error) {
      logger.error(`Error closing browser for account ${accountId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Навигация на указанный URL
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @param {string} url - URL для навигации
   * @param {Object} options - Опции навигации
   */
  async navigateToUrl(accountId, url, options = {}) {
    try {
      const { page } = await this.getBrowserForAccount(accountId);
      
      // Добавляем случайную задержку для имитации человеческого поведения
      const randomDelay = Math.floor(Math.random() * 1000) + 500;
      await page.waitForTimeout(randomDelay);
      
      // Выполняем навигацию с опциями
      const navigationOptions = {
        waitUntil: 'networkidle',
        timeout: 60000,
        ...options
      };
      
      await page.goto(url, navigationOptions);
      
      // Добавляем случайную задержку после загрузки страницы
      const afterLoadDelay = Math.floor(Math.random() * 1000) + 500;
      await page.waitForTimeout(afterLoadDelay);
      
      return page;
    } catch (error) {
      logger.error(`Error navigating to ${url} for account ${accountId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Проверка авторизации Facebook
   * @param {string|Object} accountId - ID аккаунта или объект аккаунта
   * @returns {Promise<boolean>} - Результат проверки авторизации
   */
  async checkFacebookAuth(accountId) {
    try {
      const { page } = await this.getBrowserForAccount(accountId);
      
      // Переходим на Facebook
      await this.navigateToUrl(accountId, 'https://www.facebook.com');
      
      // Проверяем наличие элементов, которые отображаются только авторизованным пользователям
      const isLoggedIn = await page.evaluate(() => {
        // Проверка по различным элементам UI Facebook
        const hasUserMenu = !!document.querySelector('[aria-label="Your profile"]');
        const hasCreatePost = !!document.querySelector('[aria-label="Create"]');
        const hasLoginForm = !!document.querySelector('form[action*="login"]');
        
        return (hasUserMenu || hasCreatePost) && !hasLoginForm;
      });
      
      if (isLoggedIn) {
        logger.info(`Account ${accountId} is authenticated on Facebook`);
      } else {
        logger.warn(`Account ${accountId} is NOT authenticated on Facebook`);
      }
      
      return isLoggedIn;
    } catch (error) {
      logger.error(`Error checking Facebook auth for account ${accountId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Закрытие всех активных сессий браузера
   */
  async closeAllBrowsers() {
    const accountKeys = [...this.browsers.keys()];
    
    for (const accountKey of accountKeys) {
      try {
        await this.closeBrowserForAccount(accountKey);
      } catch (error) {
        logger.error(`Error closing browser for account ${accountKey}: ${error.message}`);
      }
    }
    
    logger.info('All browser sessions closed');
  }
}

// Обработка закрытия приложения
process.on('exit', async () => {
  const browser = new PlaywrightBrowser();
  await browser.closeAllBrowsers();
});

process.on('SIGINT', async () => {
  const browser = new PlaywrightBrowser();
  await browser.closeAllBrowsers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  const browser = new PlaywrightBrowser();
  await browser.closeAllBrowsers();
  process.exit(0);
});

module.exports = new PlaywrightBrowser();