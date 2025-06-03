const mongoose = require('mongoose');

const configurationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  defaultHardware: [
    {
      hardwareId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hardware' },
      quantity: { type: Number, default: 1 },
    },
  ],
  defaultGlass: [
    {
      glassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Glass' },
      quantity: { type: Number, default: 1 },
    },
  ],
  allowExtraProfiles: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Configuration', configurationSchema);
