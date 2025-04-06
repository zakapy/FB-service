const Joi = require('joi');
const { mongoIdSchema } = require('../middlewares/validator.middleware');

const createAccount = {
  body: Joi.object({
    name: Joi.string().required().min(3).max(100),
    cookies: Joi.string().required(),
    proxyId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    emailAccess: Joi.object({
      email: Joi.string().email(),
      password: Joi.string(),
      recoveryEmail: Joi.string().email(),
      phoneNumber: Joi.string()
    }),
    notes: Joi.string().max(1000),
    createDolphinProfile: Joi.boolean()
  })
};

const getAccount = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

const updateAccount = {
  params: Joi.object({
    id: mongoIdSchema.required()
  }),
  body: Joi.object({
    name: Joi.string().min(3).max(100),
    cookies: Joi.string(),
    proxyId: Joi.alternatives().try(
      Joi.string().regex(/^[0-9a-fA-F]{24}$/),
      Joi.allow(null)
    ),
    emailAccess: Joi.object({
      email: Joi.string().email(),
      password: Joi.string(),
      recoveryEmail: Joi.string().email(),
      phoneNumber: Joi.string()
    }),
    notes: Joi.string().max(1000),
    status: Joi.string().valid('active', 'inactive', 'banned', 'limited')
  })
};

const deleteAccount = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

const checkStatus = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

const updateCookies = {
  params: Joi.object({
    id: mongoIdSchema.required()
  }),
  body: Joi.object({
    cookies: Joi.string().required()
  })
};

const assignProxy = {
  params: Joi.object({
    id: mongoIdSchema.required()
  }),
  body: Joi.object({
    proxyId: mongoIdSchema.required()
  })
};

const removeProxy = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

const createDolphinProfile = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

const getStats = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

module.exports = {
  createAccount,
  getAccount,
  updateAccount,
  deleteAccount,
  checkStatus,
  updateCookies,
  assignProxy,
  removeProxy,
  createDolphinProfile,
  getStats
};