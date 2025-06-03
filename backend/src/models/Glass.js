const mongoose = require('mongoose');

const glassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  thickness: { type: String }, // например, '8 мм'
  color: { type: String },
  price: { type: Number, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Glass', glassSchema);
