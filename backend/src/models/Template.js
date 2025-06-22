const mongoose = require('mongoose');

const templateFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'select'], required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  options: [String],
});

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: ['straight', 'corner', 'unique', 'custom', 'glass', 'partition'],
    default: 'custom',
  },

  // Конфигурация стекол
  glassConfig: [
    {
      name: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
        enum: ['stationary', 'swing_door', 'sliding_door'],
      },
      color: {
        type: String,
        default: '',
      },
      thickness: {
        type: String,
        default: '',
      },
    },
  ],

  // Настройки корректировок размеров
  sizeAdjustments: {
    doorHeightReduction: {
      type: Number,
      default: 8, // мм на сколько уменьшать высоту двери
    },
    thresholdReduction: {
      type: Number,
      default: 15, // мм дополнительное уменьшение для порожка
    },
  },

  fields: [templateFieldSchema],
  defaultHardware: [String],
  defaultServices: [String],
  customColorOption: { type: Boolean, default: false },
  exactHeightOption: { type: Boolean, default: false },
  defaultGlassColor: { type: String, default: '' },
  defaultGlassThickness: { type: String, default: '' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  isSystem: { type: Boolean, default: false }, // Признак системного шаблона
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Индекс для быстрого поиска по компании
templateSchema.index({ companyId: 1 });

// Обновляем updatedAt при сохранении
templateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Template', templateSchema);
