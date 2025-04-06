const Joi = require('joi');
const { mongoIdSchema } = require('../../middlewares/validator.middleware');

const createProxy = {
  body: Joi.object({
    name: Joi.string().required().min(3).max(100),
    type: Joi.string().valid('http', 'https', 'socks4', 'socks5').required(),
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    username: Joi.string().allow('', null),
    password: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    provider: Joi.string().allow('', null),
    expiresAt: Joi.date().allow(null),
    notes: Joi.string().max(1000).allow('', null),
    tags: Joi.array().items(Joi.string())
  })
};

const getProxy = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

const updateProxy = {
  params: Joi.object({
    id: mongoIdSchema.required()
  }),
  body: Joi.object({
    name: Joi.string().min(3).max(100),
    type: Joi.string().valid('http', 'https', 'socks4', 'socks5'),
    host: Joi.string(),
    port: Joi.number().integer().min(1).max(65535),
    username: Joi.string().allow('', null),
    password: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    provider: Joi.string().allow('', null),
    expiresAt: Joi.date().allow(null),
    notes: Joi.string().max(1000).allow('', null),
    tags: Joi.array().items(Joi.string()),
    status: Joi.string().valid('active', 'inactive', 'expired', 'error')
  })
};

const deleteProxy = {
  params: Joi.object({
    id: mongoIdSchema.required()
  }),
  query: Joi.object({
    force: Joi.boolean()
  })
};

const checkProxy = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

const importProxies = {
  body: Joi.object({
    proxies: Joi.array().items(
      Joi.alternatives().try(
        Joi.string(),
        Joi.object({
          name: Joi.string(),
          type: Joi.string().valid('http', 'https', 'socks4', 'socks5'),
          host: Joi.string().required(),
          port: Joi.number().integer().min(1).max(65535).required(),
          username: Joi.string().allow('', null),
          password: Joi.string().allow('', null)
        })
      )
    ).required(),
    defaultType: Joi.string().valid('http', 'https', 'socks4', 'socks5'),
    defaultProvider: Joi.string(),
    defaultTags: Joi.array().items(Joi.string())
  })
};

const getProxyAccounts = {
  params: Joi.object({
    id: mongoIdSchema.required()
  })
};

module.exports = {
  createProxy,
  getProxy,
  updateProxy,
  deleteProxy,
  checkProxy,
  importProxies,
  getProxyAccounts
};