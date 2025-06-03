const mongoose = require('mongoose');

const hardwareSchema = new mongoose.Schema({
  name: { type: String, required: true },
  section: { type: String }, // категория
  price: { type: Number, required: false, default: null },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  color: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

hardwareSchema.index({ companyId: 1, name: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Hardware', hardwareSchema);
