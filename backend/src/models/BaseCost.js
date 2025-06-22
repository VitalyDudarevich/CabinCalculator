const mongoose = require('mongoose');

const baseCostSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true },
);

// Составной индекс для уникальности name + companyId
baseCostSchema.index({ name: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('BaseCost', baseCostSchema);
