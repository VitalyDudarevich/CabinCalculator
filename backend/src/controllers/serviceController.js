const Service = require('../models/Service');

exports.getServicesByCompany = async (req, res) => {
  try {
    const { companyId } = req.query;
    let services;
    if (companyId) {
      services = await Service.find({ companyId });
    } else {
      services = await Service.find();
    }
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateServices = async (req, res) => {
  try {
    const { companyId } = req.query;
    const services = req.body; // массив объектов { name, price, ... }
    if (!companyId || !Array.isArray(services)) {
      return res.status(400).json({ error: 'companyId и массив услуг обязательны' });
    }
    // Проверка обязательных полей (только name и price)
    for (const s of services) {
      if (!s.name || typeof s.price !== 'number') {
        return res.status(400).json({ error: 'Каждая услуга должна содержать name и price' });
      }
    }
    await Service.deleteMany({ companyId });
    const created = await Service.insertMany(services.map((s) => ({ ...s, companyId })));
    res.json(created);
  } catch (err) {
    console.error('Ошибка обновления услуг:', err);
    res.status(500).json({ error: 'Ошибка обновления услуг' });
  }
};
