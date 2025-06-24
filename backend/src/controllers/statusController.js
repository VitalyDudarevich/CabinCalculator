const Status = require('../models/Status');
const Project = require('../models/Project');

// Получить все статусы компании
exports.getStatuses = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'CompanyId is required' });
    }

    const statuses = await Status.find({
      companyId: companyId,
      isActive: true,
    }).sort({ order: 1 });

    res.json(statuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Получить статус по ID
exports.getStatusById = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id).populate('companyId', 'name');

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Создать новый статус
exports.createStatus = async (req, res) => {
  try {
    const { name, color, companyId, order } = req.body;

    // Валидация обязательных полей
    if (!name || !color || !companyId) {
      return res.status(400).json({
        error: 'Name, color, and companyId are required',
      });
    }

    // Проверяем, что такого статуса еще нет у этой компании
    const existingStatus = await Status.findOne({
      name: name,
      companyId: companyId,
    });

    if (existingStatus) {
      return res.status(409).json({
        error: 'Status with this name already exists for this company',
      });
    }

    // Если order не указан, устанавливаем его как максимальный + 1
    let statusOrder = order;
    if (!statusOrder) {
      const maxOrder = await Status.findOne({
        companyId: companyId,
      }).sort({ order: -1 });
      statusOrder = maxOrder ? maxOrder.order + 1 : 1;
    }

    const status = new Status({
      name,
      color,
      companyId,
      order: statusOrder,
      isDefault: false, // Пользовательские статусы не являются default
    });

    await status.save();

    const populatedStatus = await Status.findById(status._id).populate('companyId', 'name');
    res.status(201).json(populatedStatus);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Status with this name already exists for this company',
      });
    }
    res.status(400).json({ error: err.message });
  }
};

// Обновить статус
exports.updateStatus = async (req, res) => {
  try {
    const statusId = req.params.id;
    const { name, color, order, isActive } = req.body;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Проверяем, что новое имя не конфликтует с существующими
    if (name && name !== status.name) {
      const existingStatus = await Status.findOne({
        name: name,
        companyId: status.companyId,
        _id: { $ne: statusId },
      });

      if (existingStatus) {
        return res.status(409).json({
          error: 'Status with this name already exists for this company',
        });
      }
    }

    // Обновляем поля
    if (name) status.name = name;
    if (color) status.color = color;
    if (typeof order === 'number') status.order = order;
    if (typeof isActive === 'boolean') status.isActive = isActive;

    await status.save();

    // Если статус был деактивирован, нужно обновить проекты с этим статусом
    if (isActive === false) {
      // Найдем статус "Рассчет" как fallback
      const fallbackStatus = await Status.findOne({
        name: 'Рассчет',
        companyId: status.companyId,
        isActive: true,
      });

      if (fallbackStatus) {
        await Project.updateMany(
          { statusId: statusId },
          {
            statusId: fallbackStatus._id,
            status: fallbackStatus.name, // Для обратной совместимости
          },
        );
      }
    }

    const populatedStatus = await Status.findById(status._id).populate('companyId', 'name');
    res.json(populatedStatus);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Status with this name already exists for this company',
      });
    }
    res.status(400).json({ error: err.message });
  }
};

// Удалить статус
exports.deleteStatus = async (req, res) => {
  try {
    const statusId = req.params.id;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Проверяем, что это не системный статус
    if (status.isDefault) {
      return res.status(403).json({
        error: 'Cannot delete default system status',
      });
    }

    // Проверяем, есть ли проекты с этим статусом
    const projectsCount = await Project.countDocuments({ statusId: statusId });

    if (projectsCount > 0) {
      // Найдем статус "Рассчет" как fallback
      const fallbackStatus = await Status.findOne({
        name: 'Рассчет',
        companyId: status.companyId,
        isActive: true,
      });

      if (!fallbackStatus) {
        return res.status(400).json({
          error:
            'Cannot delete status: no fallback status available and projects are using this status',
        });
      }

      // Переносим все проекты на fallback статус
      await Project.updateMany(
        { statusId: statusId },
        {
          statusId: fallbackStatus._id,
          status: fallbackStatus.name,
        },
      );
    }

    await Status.findByIdAndDelete(statusId);

    res.json({
      message: 'Status deleted successfully',
      projectsMoved: projectsCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Получить статистику использования статусов
exports.getStatusStats = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'CompanyId is required' });
    }

    // Получаем все статусы компании
    const statuses = await Status.find({
      companyId: companyId,
      isActive: true,
    }).sort({ order: 1 });

    // Получаем статистику по проектам для каждого статуса
    const stats = await Promise.all(
      statuses.map(async (status) => {
        const projectCount = await Project.countDocuments({ statusId: status._id });
        return {
          ...status.toObject(),
          projectCount,
        };
      }),
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Изменить порядок статусов
exports.reorderStatuses = async (req, res) => {
  try {
    const { statusOrder } = req.body; // Массив объектов [{ id, order }, ...]

    if (!Array.isArray(statusOrder)) {
      return res.status(400).json({ error: 'statusOrder must be an array' });
    }

    // Обновляем порядок для каждого статуса
    const updatePromises = statusOrder.map(({ id, order }) =>
      Status.findByIdAndUpdate(id, { order }, { new: true }),
    );

    await Promise.all(updatePromises);

    res.json({ message: 'Status order updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
