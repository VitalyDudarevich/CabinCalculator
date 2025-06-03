const Setting = require('../models/Setting');

exports.getAllSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettingById = async (req, res) => {
  try {
    const setting = await Setting.findById(req.params.id);
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSetting = async (req, res) => {
  try {
    const setting = new Setting({
      ...req.body,
      baseCosts: req.body.baseCosts || [],
      baseIsPercent: req.body.baseIsPercent ?? false,
      basePercentValue: req.body.basePercentValue ?? 0,
    });
    await setting.save();
    res.status(201).json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const update = {
      ...req.body,
    };
    if (!('baseCosts' in update)) update.baseCosts = [];
    if (!('baseIsPercent' in update)) update.baseIsPercent = false;
    if (!('basePercentValue' in update)) update.basePercentValue = 0;
    const setting = await Setting.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteSetting = async (req, res) => {
  try {
    const setting = await Setting.findByIdAndDelete(req.params.id);
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json({ message: 'Setting deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
