const Hardware = require('../models/Hardware');
const mongoose = require('mongoose');

exports.getHardwareById = async (req, res) => {
  try {
    const hardware = await Hardware.findById(req.params.id);
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' });
    res.json(hardware);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createHardware = async (req, res) => {
  try {
    const hardware = new Hardware(req.body);
    await hardware.save();
    res.status(201).json(hardware);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateHardware = async (req, res) => {
  try {
    const hardware = await Hardware.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' });
    res.json(hardware);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteHardware = async (req, res) => {
  try {
    const hardware = await Hardware.findByIdAndDelete(req.params.id);
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' });
    res.json({ message: 'Hardware deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkUpdateHardware = async (req, res) => {
  const { companyId } = req.query;
  const hardwareList = req.body;
  if (!companyId || !Array.isArray(hardwareList)) {
    return res.status(400).json({ error: 'companyId и массив hardware обязательны' });
  }
  try {
    for (const hw of hardwareList) {
      const { _id, ...rest } = hw;
      await Hardware.findOneAndUpdate(
        { name: hw.name, companyId },
        { ...rest, companyId },
        { upsert: true, new: true },
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAllDoorHinges = async (req, res) => {
  try {
    const result = await Hardware.deleteMany({ name: 'Петля дверная' });
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Новый эндпоинт: получить hardware по companyId
exports.getHardwareByCompany = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId обязателен' });

    let filter = {};
    if (mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    } else {
      filter.companyId = companyId;
    }
    const hardware = await Hardware.find(filter);
    res.json(hardware);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
