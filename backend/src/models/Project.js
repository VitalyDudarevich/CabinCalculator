const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  data: { type: Object, required: true }, // все данные калькулятора/проекта
  name: { type: String }, // название проекта (опционально)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Project', projectSchema);
