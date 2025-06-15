const Project = require('../models/Project');

// Получить проекты (по companyId или userId)
exports.getProjects = async (req, res) => {
  try {
    const { companyId, userId } = req.query;
    let filter = {};
    if (companyId) filter.companyId = companyId;
    if (userId) filter.userId = userId;
    const projects = await Project.find(filter).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Получить проект по id
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Создать проект
exports.createProject = async (req, res) => {
  try {
    const { price, status } = req.body;
    const now = new Date();
    const initialStatus = status || 'Рассчет';
    const project = new Project({
      ...req.body,
      priceHistory: [{ price, date: now }],
      statusHistory: [{ status: initialStatus, date: now }],
      createdAt: now,
      updatedAt: now,
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Обновить проект
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Если цена изменилась — добавляем в историю новую цену с датой изменения
    if (typeof req.body.price === 'number' && req.body.price !== project.price) {
      project.priceHistory = [
        ...(Array.isArray(project.priceHistory) ? project.priceHistory : []),
        { price: req.body.price, date: new Date() },
      ];
      project.price = req.body.price;
    }
    // Если статус изменился — добавляем в историю новый статус с датой
    if (req.body.status && req.body.status !== project.status) {
      project.statusHistory = [
        ...(Array.isArray(project.statusHistory) ? project.statusHistory : []),
        { status: req.body.status, date: new Date() },
      ];
      project.status = req.body.status;
    }
    // Удаляем priceHistory и statusHistory из req.body, чтобы не затирать историю
    delete req.body.priceHistory;
    delete req.body.statusHistory;
    // Обновляем остальные поля
    Object.assign(project, req.body);
    project.updatedAt = new Date();
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Удалить проект
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
