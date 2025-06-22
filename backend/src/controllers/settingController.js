const Setting = require('../models/Setting');

exports.getAllSettings = async (req, res) => {
  try {
    const { companyId } = req.query;
    if (companyId) {
      const setting = await Setting.findOne({ companyId });
      res.json(setting ? [setting] : []);
    } else {
      const settings = await Setting.find();
      res.json(settings);
    }
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
    const { companyId } = req.body;
    let setting = await Setting.findOne({ companyId });
    if (setting) {
      // Обновить существующую настройку
      setting.set({
        ...req.body,
        baseIsPercent: req.body.baseIsPercent ?? false,
        basePercentValue: req.body.basePercentValue ?? 0,
        customColorSurcharge: req.body.customColorSurcharge ?? 0,
        baseCostMode: req.body.baseCostMode ?? 'fixed',
        baseCostPercentage: req.body.baseCostPercentage ?? 0,
      });
      await setting.save();
      res.status(200).json(setting);
    } else {
      // Создать новую настройку
      setting = new Setting({
        ...req.body,
        baseIsPercent: req.body.baseIsPercent ?? false,
        basePercentValue: req.body.basePercentValue ?? 0,
        customColorSurcharge: req.body.customColorSurcharge ?? 0,
        baseCostMode: req.body.baseCostMode ?? 'fixed',
        baseCostPercentage: req.body.baseCostPercentage ?? 0,
      });
      await setting.save();
      res.status(201).json(setting);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const update = {
      ...req.body,
    };
    if (!('baseIsPercent' in update)) update.baseIsPercent = false;
    if (!('basePercentValue' in update)) update.basePercentValue = 0;
    if (!('customColorSurcharge' in update)) update.customColorSurcharge = 0;
    if (!('baseCostMode' in update)) update.baseCostMode = 'fixed';
    if (!('baseCostPercentage' in update)) update.baseCostPercentage = 0;
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
