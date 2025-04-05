const User = require('../database/models/user.model');  
const { ApiError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Регистрация нового пользователя
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Проверка, существует ли пользователь с таким email
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        throw new ApiError(400, 'Email already exists');
      }
      throw new ApiError(400, 'Username already exists');
    }
    
    // Создание нового пользователя
    const user = new User({
      username,
      email,
      password,
      role: 'user'
    });
    
    // Сохранение пользователя в базе
    await user.save();
    
    // Генерация токена
    const token = user.generateToken();
    
    logger.info(`User registered: ${username}, ${email}`);
    
    // Отправка ответа
    res.status(201).json({
      status: 'success',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Авторизация пользователя
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Поиск пользователя по email
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }
    
    // Проверка, активен ли пользователь
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated');
    }
    
    // Обновление времени последнего входа
    user.lastLogin = new Date();
    await user.save();
    
    // Генерация токена
    const token = user.generateToken();
    
    logger.info(`User logged in: ${user.username}, ${user.email}`);
    
    // Отправка ответа
    res.json({
      status: 'success',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Выход из системы
 */
const logout = async (req, res, next) => {
  try {
    // Будущая реализация может включать добавление токена в черный список
    // или удаление токена из базы данных
    
    logger.info(`User logged out: ${req.user.username}, ${req.user.email}`);
    
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение информации о текущем пользователе
 */
const getProfile = async (req, res, next) => {
  try {
    // Обновляем данные пользователя из базы
    const user = await User.findById(req.user._id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    res.json({
      status: 'success',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление информации о пользователе
 */
const updateProfile = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    
    // Проверка, не занят ли username или email другим пользователем
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.user._id } },
        { $or: [{ username }, { email }] }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        throw new ApiError(400, 'Email already in use by another account');
      }
      throw new ApiError(400, 'Username already in use by another account');
    }
    
    // Обновление пользователя
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username, email },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    logger.info(`User updated profile: ${user.username}, ${user.email}`);
    
    res.json({
      status: 'success',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Изменение пароля
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Получаем пользователя из базы
    const user = await User.findById(req.user._id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Проверка текущего пароля
    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError(401, 'Current password is incorrect');
    }
    
    // Обновление пароля
    user.password = newPassword;
    await user.save();
    
    logger.info(`User changed password: ${user.username}, ${user.email}`);
    
    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Запрос на восстановление пароля
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Поиск пользователя по email
    const user = await User.findOne({ email });
    
    if (!user) {
      // Не сообщаем, что пользователь не найден в целях безопасности
      return res.json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link'
      });
    }
    
    // TODO: Реализация отправки email для сброса пароля
    
    logger.info(`Password reset requested for: ${email}`);
    
    res.json({
      status: 'success',
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Сброс пароля
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    // TODO: Проверка токена сброса пароля и обновление пароля
    
    res.json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление токена доступа
 */
const refreshToken = async (req, res, next) => {
  try {
    // TODO: Реализация обновления токена с использованием refresh token
    
    res.json({
      status: 'success',
      data: {
        token: 'new-token'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken
};