require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES || 60 * 24 * 7, // 7 days
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fb-automation',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  dolphinAnty: {
    apiKey: process.env.DOLPHIN_API_KEY || '',
    apiUrl: process.env.DOLPHIN_API_URL || 'https://anty-api.com',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  paths: {
    uploads: process.env.UPLOADS_PATH || './uploads',
  }
};

module.exports = config;