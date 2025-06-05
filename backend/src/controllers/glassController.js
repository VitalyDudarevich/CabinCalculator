const Glass = require('../models/Glass');
const mongoose = require('mongoose');

// Получить все варианты стекла по companyId
exports.getGlassByCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId обязателен' });
    let filter = {};
    if (mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    } else {
      filter.companyId = companyId;
    }
    const glassList = await Glass.find(filter);
    res.json(glassList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Добавить вариант стекла
exports.createGlass = async (req, res) => {
  try {
    const { name, thickness, color, price, companyId } = req.body;
    if (!name || !companyId) return res.status(400).json({ error: 'name и companyId обязательны' });
    const glass = new Glass({ name, thickness, color, price, companyId });
    await glass.save();
    res.status(201).json(glass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Удалить вариант стекла по id
exports.deleteGlass = async (req, res) => {
  try {
    const { id } = req.params;
    const glass = await Glass.findByIdAndDelete(id);
    if (!glass) return res.status(404).json({ error: 'Вариант стекла не найден' });
    res.json({ message: 'Вариант стекла удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Обновить вариант стекла по id
exports.updateGlass = async (req, res) => {
  try {
    const { id } = req.params;
    const glass = await Glass.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!glass) return res.status(404).json({ error: 'Вариант стекла не найден' });
    res.json(glass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Массовое обновление вариантов стекла для компании
exports.updateGlassList = async (req, res) => {
  try {
    const { companyId } = req.query;
    const glassList = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId required' });
    // Удаляем все старые варианты стекла компании
    await Glass.deleteMany({ companyId });
    // Добавляем новые
    const inserted = await Glass.insertMany(glassList.map((item) => ({ ...item, companyId })));
    res.json(inserted);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка обновления стекла' });
  }
};
