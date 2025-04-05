const mongoose = require('mongoose');
const crypto = require('crypto');

// Шифрование чувствительных данных
const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-that-is-32chars-long!';
const algorithm = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return null;
  }
}

const proxySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['http', 'https', 'socks4', 'socks5'],
    default: 'http'
  },
  host: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    required: true
  },
  username: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    get: decrypt,
    set: encrypt
  },
  country: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  provider: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date
  },
  lastChecked: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'error'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true
  },
  lastIp: {
    type: String,
    trim: true
  },
  currentUsage: {
    type: Number,
    default: 0
  },
  maxUsage: {
    type: Number,
    default: 0 // 0 означает неограниченное использование
  },
  ping: {
    type: Number
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Индексы для быстрого поиска
proxySchema.index({ user: 1 });
proxySchema.index({ status: 1 });
proxySchema.index({ type: 1 });
proxySchema.index({ country: 1 });
proxySchema.index({ provider: 1 });
proxySchema.index({ host: 1, port: 1 }, { unique: false });

// Виртуальное поле для получения полного URL прокси
proxySchema.virtual('url').get(function() {
  let auth = '';
  if (this.username && this.password) {
    auth = `${this.username}:${this.password}@`;
  }
  return `${this.type}://${auth}${this.host}:${this.port}`;
});

// Виртуальное поле для проверки доступности прокси
proxySchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && 
         (!this.maxUsage || this.currentUsage < this.maxUsage) &&
         (!this.expiresAt || this.expiresAt > new Date());
});

// Метод для форматирования прокси для Playwright
proxySchema.methods.getPlaywrightConfig = function() {
  const config = {
    server: `${this.host}:${this.port}`,
    type: this.type
  };
  
  if (this.username && this.password) {
    config.username = this.username;
    config.password = this.password;
  }
  
  return config;
};

// Метод для форматирования прокси для Dolphin Anty
proxySchema.methods.getDolphinConfig = function() {
  return {
    name: this.name,
    type: this.type.toUpperCase(),
    host: this.host,
    port: this.port,
    username: this.username || '',
    password: this.password || ''
  };
};

// Преобразование в JSON без чувствительных данных
proxySchema.methods.toJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Proxy', proxySchema);