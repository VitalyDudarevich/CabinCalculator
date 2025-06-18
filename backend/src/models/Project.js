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
    status: { type: String, required: true },
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
  status: { type: String, default: 'Рассчет' }, // статус проекта
  price: { type: Number, default: 0 }, // итоговая сумма
  priceHistory: { type: [priceHistorySchema], default: [] },
  statusHistory: { type: [statusHistorySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Project', projectSchema);
