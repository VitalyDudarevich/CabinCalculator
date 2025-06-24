const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    date: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    statusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Status',
      required: true,
    },
    status: { type: String }, // Устаревшее поле для обратной совместимости
    date: { type: Date, default: Date.now },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  data: { type: Object, required: true }, // все данные калькулятора/проекта
  name: { type: String }, // название проекта (опционально)
  customer: { type: String }, // имя заказчика (опционально)
  // Новое поле для ссылки на модель Status
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: false, // Пока не обязательное для миграции
  },
  // Старое поле для обратной совместимости (будет удалено после миграции)
  status: { type: String, default: 'Рассчет' },
  price: { type: Number, default: 0 }, // итоговая сумма
  priceHistory: { type: [priceHistorySchema], default: [] },
  statusHistory: { type: [statusHistorySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Виртуальное поле для получения статуса с populate
projectSchema.virtual('statusData', {
  ref: 'Status',
  localField: 'statusId',
  foreignField: '_id',
  justOne: true,
});

// Включаем виртуальные поля в JSON
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

// Индексы для оптимизации
projectSchema.index({ companyId: 1, statusId: 1 });
projectSchema.index({ statusId: 1 });
projectSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
