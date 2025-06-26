const Project = require('../models/Project');
const Status = require('../models/Status');

// Получить проекты (по companyId или userId)
exports.getProjects = async (req, res) => {
  try {
    const { companyId, userId, statusId } = req.query;
    let filter = {};
    if (companyId) filter.companyId = companyId;
    if (userId) filter.userId = userId;
    if (statusId) filter.statusId = statusId;

    const projects = await Project.find(filter)
      .populate('statusId', 'name color order')
      .populate('companyId', 'name')
      .populate('statusHistory.statusId', 'name color')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Получить проект по id
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('statusId', 'name color order')
      .populate('companyId', 'name')
      .populate('statusHistory.statusId', 'name color');

    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Создать проект
exports.createProject = async (req, res) => {
  try {
    const { price, status, statusId, companyId } = req.body;
    const now = new Date();

    // Определяем статус проекта
    let projectStatusId = statusId;

    // Если statusId не передан, но передан status (старый формат), найдем соответствующий статус
    if (!projectStatusId && status && companyId) {
      const statusDoc = await Status.findOne({
        name: status,
        companyId: companyId,
        isActive: true,
      });
      if (statusDoc) {
        projectStatusId = statusDoc._id;
      }
    }

    // Если статус все еще не определен, используем статус "Рассчет" по умолчанию
    if (!projectStatusId && companyId) {
      const defaultStatus = await Status.findOne({
        name: 'Рассчет',
        companyId: companyId,
        isActive: true,
      });
      if (defaultStatus) {
        projectStatusId = defaultStatus._id;
      }
    }

    const project = new Project({
      ...req.body,
      statusId: projectStatusId,
      status: status || 'Рассчет', // Сохраняем для обратной совместимости
      priceHistory: [{ price, date: now }],
      statusHistory: projectStatusId
        ? [{ statusId: projectStatusId, status: status, date: now }]
        : [],
      createdAt: now,
      updatedAt: now,
    });

    await project.save();

    // Возвращаем проект с populated данными
    const populatedProject = await Project.findById(project._id)
      .populate('statusId', 'name color order')
      .populate('companyId', 'name');

    res.status(201).json(populatedProject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Обновить проект
exports.updateProject = async (req, res) => {
  try {
    console.log('🔄 updateProject called with body:', JSON.stringify(req.body, null, 2));

    const project = await Project.findById(req.params.id).populate('statusId');
    if (!project) return res.status(404).json({ error: 'Project not found' });

    console.log('📋 Current project status:', {
      currentStatus: project.status,
      currentStatusId: project.statusId?._id,
      requestStatus: req.body.status,
      requestStatusId: req.body.statusId,
    });

    // Если цена изменилась — добавляем в историю новую цену с датой изменения
    if (typeof req.body.price === 'number' && req.body.price !== project.price) {
      project.priceHistory = [
        ...(Array.isArray(project.priceHistory) ? project.priceHistory : []),
        { price: req.body.price, date: new Date() },
      ];
      project.price = req.body.price;
    }

    // Обработка изменения статуса
    let statusChanged = false;
    let newStatusId = req.body.statusId;
    let newStatusName = req.body.status;

    // Если передан statusId, используем его
    if (req.body.statusId && req.body.statusId !== project.statusId?.toString()) {
      // Проверяем, что статус существует
      const newStatus = await Status.findById(req.body.statusId);
      if (newStatus) {
        newStatusId = newStatus._id;
        newStatusName = newStatus.name;
        statusChanged = true;
      } else {
        // Если statusId невалидный, не изменяем статус
        console.warn(`Invalid statusId provided: ${req.body.statusId}`);
        newStatusId = null;
      }
    }
    // Если передан только status (старый формат), найдем соответствующий statusId
    else if (req.body.status && req.body.status !== project.status) {
      const statusDoc = await Status.findOne({
        name: req.body.status,
        companyId: project.companyId,
        isActive: true,
      });
      if (statusDoc) {
        newStatusId = statusDoc._id;
        newStatusName = statusDoc.name;
        statusChanged = true;
      } else {
        // Если status не найден, не изменяем статус
        console.warn(`Status not found: ${req.body.status} for company: ${project.companyId}`);
        newStatusId = null;
      }
    }

    // Если статус изменился И найден валидный statusId, добавляем в историю
    if (statusChanged && newStatusId) {
      const newHistoryEntry = { statusId: newStatusId, status: newStatusName, date: new Date() };
      console.log('📝 Adding to statusHistory:', newHistoryEntry);

      project.statusHistory = [
        ...(Array.isArray(project.statusHistory) ? project.statusHistory : []),
        newHistoryEntry,
      ];
      project.statusId = newStatusId;
      project.status = newStatusName; // Обновляем для обратной совместимости

      console.log('✅ Status updated successfully:', {
        newStatusId,
        newStatusName,
        statusHistoryLength: project.statusHistory.length,
      });
    } else if (statusChanged && !newStatusId) {
      console.error('❌ Status changed but no valid statusId found!', {
        statusChanged,
        newStatusId,
        requestStatus: req.body.status,
        requestStatusId: req.body.statusId,
      });
    }

    // Удаляем priceHistory и statusHistory из req.body, чтобы не затирать историю
    delete req.body.priceHistory;
    delete req.body.statusHistory;

    // Обновляем остальные поля
    Object.assign(project, req.body);
    project.updatedAt = new Date();
    await project.save();

    // Возвращаем проект с populated данными
    const populatedProject = await Project.findById(project._id)
      .populate('statusId', 'name color order')
      .populate('companyId', 'name')
      .populate('statusHistory.statusId', 'name color');

    res.json(populatedProject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Быстрое обновление статуса проекта (для drag & drop)
exports.updateProjectStatus = async (req, res) => {
  try {
    const { statusId } = req.body;
    const projectId = req.params.id;

    if (!statusId) {
      return res.status(400).json({ error: 'StatusId is required' });
    }

    // Проверяем, что статус существует
    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Получаем проект
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Проверяем, что статус принадлежит той же компании, что и проект
    if (project.companyId && status.companyId.toString() !== project.companyId.toString()) {
      return res
        .status(403)
        .json({ error: 'Status does not belong to the same company as project' });
    }

    // Обновляем статус только если он изменился
    if (project.statusId?.toString() !== statusId) {
      // Добавляем в историю изменений
      project.statusHistory = [
        ...(Array.isArray(project.statusHistory) ? project.statusHistory : []),
        { statusId: statusId, status: status.name, date: new Date() },
      ];

      project.statusId = statusId;
      project.status = status.name; // Для обратной совместимости
      project.updatedAt = new Date();

      await project.save();
    }

    // Возвращаем обновленный проект
    const updatedProject = await Project.findById(projectId)
      .populate('statusId', 'name color order')
      .populate('companyId', 'name');

    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
