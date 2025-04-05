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

const cookieSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  domain: String,
  path: String,
  expires: Number,
  httpOnly: Boolean,
  secure: Boolean,
  sameSite: String
});

const accountSchema = new mongoose.Schema({
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
  proxy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proxy'
  },
  cookies: {
    type: String,
    required: true,
    get: decrypt,
    set: encrypt
  },
  cookieParsed: {
    type: [cookieSchema],
    default: []
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned', 'limited'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true
  },
  dolphinProfileId: {
    type: String,
    sparse: true
  },
  stats: {
    friendCount: {
      type: Number,
      default: 0
    },
    postCount: {
      type: Number,
      default: 0
    },
    messageCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    }
  },
  emailAccess: {
    email: String,
    password: {
      type: String,
      get: decrypt,
      set: encrypt
    },
    recoveryEmail: String,
    phoneNumber: String
  },
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['email', 'phone', 'authenticator'],
      default: 'email'
    },
    secret: {
      type: String,
      get: decrypt,
      set: encrypt
    }
  }
}, {
  timestamps: true
});

// Индексы для быстрого поиска
accountSchema.index({ user: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ 'emailAccess.email': 1 });
accountSchema.index({ dolphinProfileId: 1 });

// Виртуальное поле для отслеживания активности аккаунта
accountSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Метод для парсинга строки cookies в структурированный массив
accountSchema.methods.parseCookies = function() {
  try {
    if (!this.cookies) return [];
    
    const cookiesArray = JSON.parse(this.cookies);
    this.cookieParsed = cookiesArray;
    return cookiesArray;
  } catch (error) {
    return [];
  }
};

// Преобразование в JSON без чувствительных данных
accountSchema.methods.toJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.cookies;
  
  if (obj.emailAccess) {
    delete obj.emailAccess.password;
  }
  
  if (obj.twoFactorAuth) {
    delete obj.twoFactorAuth.secret;
  }
  
  return obj;
};

module.exports = mongoose.model('Account', accountSchema);