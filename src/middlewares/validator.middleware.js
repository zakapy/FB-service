const Joi = require('joi');
const { ApiError } = require('../utils/errors');

// MongoDB ObjectId validation schema
const mongoIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Middleware для валидации запросов на основе схем Joi
 * @param {Object} schema - Схема Joi для валидации запроса
 * @returns {Function} Express middleware
 */
const validate = (schema) => (req, res, next) => {
  if (!schema) return next();
  
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));
  
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);
  
  if (error) {
    const errorMessage = error.details
      .map((details) => details.message)
      .join(', ');
    
    return next(new ApiError(400, errorMessage));
  }
  
  // Заменяем проверенные значения
  Object.assign(req, value);
  
  return next();
};

/**
 * Утилита для выбора указанных свойств из объекта
 * @param {Object} object - Исходный объект
 * @param {string[]} keys - Массив ключей для выбора
 * @returns {Object} - Новый объект с выбранными свойствами
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

module.exports = {
  validate,
  mongoIdSchema
};