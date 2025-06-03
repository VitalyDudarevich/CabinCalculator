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
