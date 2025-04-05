const mongoose = require('mongoose');

// Схема для параметров действий
const actionParamsSchema = new mongoose.Schema({
  // Общие параметры для всех типов действий
  delay: {
    min: {
      type: Number,
      default: 1000
    },
    max: {
      type: Number,
      default: 3000
    }
  },
  // Параметры для действия типа "like"
  like: {
    targetType: {
      type: String,
      enum: ['profile', 'page', 'group', 'post'],
      default: 'post'
    },
    targetUrl: String,
    count: {
      type: Number,
      default: 1
    },
    randomOrder: {
      type: Boolean,
      default: true
    }
  },
  // Параметры для действия типа "comment"
  comment: {
    targetType: {
      type: String,
      enum: ['post', 'photo', 'video'],
      default: 'post'
    },
    targetUrl: String,
    text: [String],
    includeEmoji: {
      type: Boolean,
      default: true
    }
  },
  // Параметры для действия типа "message"
  message: {
    recipientUrls: [String],
    recipientIds: [String],
    text: [String],
    includeEmoji: {
      type: Boolean,
      default: true
    },
    includeAttachment: {
      type: Boolean,
      default: false
    },
    attachments: [String] // Пути к файлам
  },
  // Параметры для действия типа "friendRequest"
  friendRequest: {
    targetUrls: [String],
    targetIds: [String],
    targetType: {
      type: String,
      enum: ['suggested', 'mutual', 'search', 'specific'],
      default: 'specific'
    },
    count: {
      type: Number,
      default: 5
    },
    addMessage: {
      type: Boolean,
      default: false
    },
    message: [String]
  },
  // Параметры для действия типа "post"
  post: {
    text: [String],
    includeEmoji: {
      type: Boolean,
      default: true
    },
    includeAttachment: {
      type: Boolean,
      default: false
    },
    attachments: [String], // Пути к файлам
    privacy: {
      type: String,
      enum: ['public', 'friends', 'onlyMe'],
      default: 'friends'
    }
  },
  // Параметры для действия типа "groupJoin"
  groupJoin: {
    groupUrls: [String],
    groupIds: [String],
    answerQuestions: {
      type: Boolean,
      default: false
    },
    answers: [{
      question: String,
      answer: String
    }]
  }
}, { _id: false });

// Схема для автоматизации
const automationSchema = new mongoose.Schema({
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
  accounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  }],
  active: {
    type: Boolean,
    default: true
  },
  actions: [{
    type: {
      type: String,
      enum: ['like', 'comment', 'message', 'friendRequest', 'post', 'groupJoin', 'profileView', 'custom'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    params: {
      type: actionParamsSchema,
      default: {}
    },
    customScript: {
      type: String,
      trim: true
    }
  }],
  schedule: {
    type: {
      type: String,
      enum: ['once', 'interval', 'daily', 'weekly', 'monthly', 'cron'],
      default: 'once'
    },
    cronExpression: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          // Простая проверка формата cron-выражения
          return !this.schedule || this.schedule.type !== 'cron' || /^(\S+\s+){4}\S+$/.test(v);
        },
        message: 'Invalid cron expression'
      }
    },
    runAt: {
      type: Date
    },
    interval: {
      value: {
        type: Number,
        default: 1
      },
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days'],
        default: 'days'
      }
    },
    timeOfDay: {
      hours: {
        type: Number,
        min: 0,
        max: 23
      },
      minutes: {
        type: Number,
        min: 0,
        max: 59
      }
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    daysOfMonth: [{
      type: Number,
      min: 1,
      max: 31
    }],
    endAt: {
      type: Date
    },
    timezoneOffset: {
      type: Number,
      default: 0
    }
  },
  currentStatus: {
    type: String,
    enum: ['idle', 'running', 'paused', 'completed', 'failed', 'waiting'],
    default: 'idle'
  },
  lastRun: {
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed']
    },
    accountsProcessed: {
      type: Number,
      default: 0
    },
    actionsPerformed: {
      type: Number,
      default: 0
    },
    errors: [{
      message: String,
      account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
      },
      action: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  nextRun: {
    type: Date
  },
  limits: {
    actionsPerDay: {
      type: Number,
      default: 50
    },
    actionsPerHour: {
      type: Number,
      default: 10
    },
    consecutiveActions: {
      type: Number,
      default: 5
    },
    pauseBetweenBatches: {
      min: {
        type: Number,
        default: 15 * 60 * 1000 // 15 минут
      },
      max: {
        type: Number,
        default: 30 * 60 * 1000 // 30 минут
      }
    }
  },
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info'
    },
    message: {
      type: String,
      required: true
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    },
    action: String,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Индексы для быстрого поиска
automationSchema.index({ user: 1 });
automationSchema.index({ 'accounts': 1 });
automationSchema.index({ active: 1 });
automationSchema.index({ 'currentStatus': 1 });
automationSchema.index({ 'nextRun': 1 });

// Метод для проверки, должна ли автоматизация запуститься в определенное время
automationSchema.methods.shouldRunAt = function(date = new Date()) {
  if (!this.active || this.currentStatus === 'running') {
    return false;
  }

  if (this.schedule.endAt && date > this.schedule.endAt) {
    return false;
  }

  const schedule = this.schedule;
  
  switch (schedule.type) {
    case 'once':
      return schedule.runAt && date >= schedule.runAt && (!this.lastRun || !this.lastRun.endTime);
    
    case 'interval':
      if (!this.lastRun || !this.lastRun.endTime) {
        return schedule.runAt ? date >= schedule.runAt : true;
      }
      
      const intervalMs = schedule.interval.value * 
        (schedule.interval.unit === 'minutes' ? 60 * 1000 : 
         schedule.interval.unit === 'hours' ? 60 * 60 * 1000 : 
         24 * 60 * 60 * 1000); // days
      
      return date >= new Date(this.lastRun.endTime.getTime() + intervalMs);
    
    // Другие типы расписаний требуют более сложной логики
    // ...
    
    default:
      return false;
  }
};

module.exports = mongoose.model('Automation', automationSchema);