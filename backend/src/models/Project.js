const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  clientAddress: { type: String },
  clientContact: { type: String },
  configuration: { type: mongoose.Schema.Types.ObjectId, ref: 'Configuration' },
  glassColor: { type: String },
  glassThickness: { type: String },
  hardwareColor: { type: String },
  dimensions: {
    width: Number,
    height: Number,
    // можно добавить другие размеры по необходимости
  },
  hardware: [
    {
      hardwareId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hardware' },
      quantity: { type: Number, default: 1 },
    },
  ],
  delivery: { type: Boolean, default: false },
  installation: { type: Boolean, default: false },
  status: {
    type: String,
    enum: [
      'Рассчет',
      'Согласован',
      'Заказан',
      'Стекло Доставлено',
      'Установка',
      'Установленно',
      'Оплачено',
    ],
    default: 'Рассчет',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  discount: { type: Number }, // процент или фиксированная сумма
  totalPrice: { type: Number },
  priceUSD: { type: Number },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  customHardware: [
    {
      hardwareId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hardware' },
      quantity: { type: Number, default: 1 },
    },
  ],
  customGlass: [
    {
      glassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Glass' },
      quantity: { type: Number, default: 1 },
    },
  ],
});

module.exports = mongoose.model('Project', projectSchema);
