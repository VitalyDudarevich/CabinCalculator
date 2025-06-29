const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Название статуса обязательно'],
      trim: true,
      maxlength: [50, 'Название статуса не может превышать 50 символов'],
    },
    color: {
      type: String,
      required: [true, 'Цвет статуса обязателен'],
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Укажите корректный hex-код цвета'],
    },
    order: {
      type: Number,
      required: [true, 'Порядок сортировки обязателен'],
      min: [0, 'Порядок должен быть положительным числом'],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'ID компании обязателен'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCompletedForAnalytics: {
      type: Boolean,
      default: false,
      description: 'Учитывать ли этот статус как завершенный в аналитике',
    },
  },
  {
    timestamps: true,
    collection: 'statuses',
  },
);

// Индексы для оптимизации запросов
statusSchema.index({ companyId: 1, order: 1 });
statusSchema.index({ companyId: 1, name: 1 }, { unique: true });
statusSchema.index({ isDefault: 1 });
statusSchema.index({ isActive: 1 });

// Статический метод для получения статусов по умолчанию
statusSchema.statics.getDefaultStatuses = function () {
  return [
    {
      name: 'Рассчет',
      color: '#bdbdbd',
      order: 1,
      isDefault: true,
      isCompletedForAnalytics: false,
    },
    {
      name: 'Согласован',
      color: '#1976d2',
      order: 2,
      isDefault: true,
      isCompletedForAnalytics: false,
    },
    {
      name: 'Заказан',
      color: '#ffa000',
      order: 3,
      isDefault: true,
      isCompletedForAnalytics: false,
    },
    {
      name: 'Стекло доставлено',
      color: '#00bcd4',
      order: 4,
      isDefault: true,
      isCompletedForAnalytics: false,
    },
    {
      name: 'Установлено',
      color: '#388e3c',
      order: 5,
      isDefault: true,
      isCompletedForAnalytics: false,
    },
    {
      name: 'Оплачено',
      color: '#2e7d32',
      order: 6,
      isDefault: true,
      isCompletedForAnalytics: true,
    },
  ];
};

// Метод для создания статусов по умолчанию для компании
statusSchema.statics.createDefaultStatusesForCompany = async function (companyId) {
  const defaultStatuses = this.getDefaultStatuses();
  const createdStatuses = [];

  for (const status of defaultStatuses) {
    try {
      // Проверяем, существует ли уже такой статус для этой компании
      const existingStatus = await this.findOne({
        companyId,
        name: status.name,
      });

      if (!existingStatus) {
        const newStatus = await this.create({
          ...status,
          companyId,
        });
        createdStatuses.push(newStatus);
        console.log(`✅ Создан статус "${status.name}" для компании ${companyId}`);
      } else {
        console.log(`ℹ️ Статус "${status.name}" уже существует для компании ${companyId}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка создания статуса "${status.name}":`, error.message);
      // Продолжаем создание остальных статусов
    }
  }

  return createdStatuses;
};

module.exports = mongoose.model('Status', statusSchema);
