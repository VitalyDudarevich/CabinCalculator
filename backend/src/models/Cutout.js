const mongoose = require('mongoose');

const cutoutSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ручка', 'ручка кноб', 'петля', 'петля ответка', 'нестандартный вырез'],
    required: true,
  },
  position: {
    type: String,
    enum: ['слева', 'справа', 'сверху', 'снизу', 'центр'],
    required: false,
  },
  width: { type: Number }, // мм
  height: { type: Number }, // мм
  distance: { type: Number }, // расстояние между отверстиями (для ручки)
  quantity: { type: Number }, // количество (для петель и ответок)
  description: { type: String }, // опционально, для нестандартных
  glassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Glass' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cutout', cutoutSchema);
