const Joi = require('joi');

const register = {
  body: Joi.object({
    username: Joi.string().required().min(3).max(50),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8)
  })
};

const login = {
  body: Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required()
  })
};

const updateProfile = {
  body: Joi.object({
    username: Joi.string().min(3).max(50),
    email: Joi.string().email()
  })
};

const changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(8)
  })
};

const forgotPassword = {
  body: Joi.object({
    email: Joi.string().required().email()
  })
};

const resetPassword = {
  body: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().required().min(8)
  })
};

const refreshToken = {
  body: Joi.object({
    refreshToken: Joi.string().required()
  })
};

module.exports = {
  register,
  login,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken
};