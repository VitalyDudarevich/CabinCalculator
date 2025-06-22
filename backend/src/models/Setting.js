const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  currency: { type: String, enum: ['GEL', 'USD', 'RR'], default: 'GEL' },
  usdRate: { type: Number, default: 0 },
  rrRate: { type: Number, default: 0 },
  showUSD: { type: Boolean, default: false },
  showRR: { type: Boolean, default: false },
  exchangeRate: { type: Number },
  basePrice: { type: Number },
  deliveryPrice: { type: Number },
  installationPrices: {
    type: Map,
    of: Number, // ключ — тип конфигурации, значение — цена
  },

  baseIsPercent: { type: Boolean, default: false },
  basePercentValue: { type: Number, default: 0 },
  customColorSurcharge: { type: Number, default: 0 }, // Надбавка за нестандартный цвет в процентах
  baseCostMode: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' }, // Режим расчета базовой стоимости
  baseCostPercentage: { type: Number, default: 0 }, // Процент от стоимости стекла и фурнитуры
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Setting', settingSchema);
