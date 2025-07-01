const Status = require('../models/Status');
const Project = require('../models/Project');
const Company = require('../models/Company');

// Получить все статусы компании
exports.getStatuses = async (req, res) => {
  try {
    const { companyId } = req.query;

    console.log('🔍 getStatuses called with companyId:', companyId);
    console.log('👤 User data:', {
      id: req.user?._id,
      role: req.user?.role,
      userCompanyId: req.user?.companyId,
      userCompanyIdType: typeof req.user?.companyId,
    });

    if (!companyId) {
      console.log('❌ No companyId provided');
      return res.status(400).json({ error: 'CompanyId is required' });
    }

    // Проверяем валидность ObjectId
    if (!companyId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Invalid companyId format:', companyId);
      return res.status(400).json({ error: 'Invalid companyId format' });
    }

    // Проверка доступа к компании
    if (req.user.role === 'superadmin') {
      console.log('✅ getStatuses: Superadmin access - allowed for any company');
    } else if (req.user.role === 'admin' || req.user.role === 'user') {
      let targetCompanyId;

      if (req.user.companyId) {
        // У пользователя есть назначенная компания
        targetCompanyId =
          typeof req.user.companyId === 'string'
            ? req.user.companyId
            : req.user.companyId._id || req.user.companyId.toString();
      } else if (req.user.role === 'admin' && companyId) {
        // Админ без назначенной компании может выбрать компанию
        targetCompanyId = companyId;
      } else {
        console.log('❌ getStatuses: User has no access to any company');
        return res.status(403).json({ error: 'Недостаточно прав для просмотра статусов' });
      }

      console.log('🔒 getStatuses: Access check:', {
        requestedCompanyId: companyId,
        userCompanyId: targetCompanyId,
        userRole: req.user.role,
        matches: targetCompanyId === companyId,
      });

      // Если запрашивается конкретная компания, проверяем права
      if (companyId && companyId !== targetCompanyId) {
        console.log('❌ getStatuses: Access denied to requested company');
        return res.status(403).json({ error: 'Нет доступа к статусам этой компании' });
      }
    } else {
      console.log('❌ getStatuses: Unknown user role');
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    console.log('🔍 Searching for statuses with companyId:', companyId);

    const statuses = await Status.find({
      companyId: companyId,
    }).sort({ order: 1 });

    console.log('✅ Found statuses:', statuses.length);

    // Если статусов нет, создаём дефолтные
    if (statuses.length === 0) {
      console.log('🔧 No statuses found, creating default statuses for company:', companyId);
      try {
        const defaultStatuses = await Status.createDefaultStatusesForCompany(companyId);
        console.log('✅ Created default statuses:', defaultStatuses.length);
        return res.json(defaultStatuses);
      } catch (createError) {
        console.error('❌ Error creating default statuses:', createError);
        // Если не удалось создать дефолтные статусы, возвращаем пустой массив
        return res.json([]);
      }
    }

    res.json(statuses);
  } catch (err) {
    console.error('❌ Error in getStatuses:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
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
    const { name, color, companyId, order, isCompletedForAnalytics } = req.body;

    // Валидация обязательных полей
    if (!name || !color || !companyId) {
      return res.status(400).json({
        error: 'Name, color, and companyId are required',
      });
    }

    // Проверяем, что такого статуса еще нет у этой компании (case-insensitive)
    const existingStatus = await Status.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
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
      isCompletedForAnalytics: isCompletedForAnalytics || false,
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
    const { name, color, order, isCompletedForAnalytics } = req.body;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Проверяем, что новое имя не конфликтует с существующими (case-insensitive)
    if (name && name !== status.name) {
      const existingStatus = await Status.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        companyId: status.companyId,
        _id: { $ne: statusId },
      });

      if (existingStatus) {
        return res.status(409).json({
          error: 'Status with this name already exists for this company',
        });
      }
    }

    const originalName = status.name;

    // Обновляем поля
    if (name) status.name = name;
    if (color) status.color = color;
    if (typeof order === 'number') status.order = order;
    if (typeof isCompletedForAnalytics === 'boolean')
      status.isCompletedForAnalytics = isCompletedForAnalytics;

    await status.save();

    // Если изменилось название статуса, обновляем все проекты с этим статусом
    if (name && name !== originalName) {
      const projects = await Project.find({ statusId: statusId });

      for (const project of projects) {
        // Обновляем текущий статус проекта
        project.status = name;

        // Добавляем запись в историю статусов о том, что статус был переименован
        if (!project.statusHistory) {
          project.statusHistory = [];
        }

        project.statusHistory.push({
          status: name,
          changedAt: new Date(),
          note: `Статус переименован с "${originalName}" на "${name}"`,
        });

        await project.save();
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

    // Проверяем, есть ли проекты с этим статусом
    const projectsCount = await Project.countDocuments({ statusId: statusId });

    if (projectsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete status: ${projectsCount} project(s) are using this status. Please move all projects to another status first.`,
        projectsCount,
      });
    }

    await Status.findByIdAndDelete(statusId);

    res.json({
      message: 'Status deleted successfully',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Получить статистику использования статусов
exports.getStatusStats = async (req, res) => {
  try {
    const { companyId } = req.query;

    console.log('📊 getStatusStats called with companyId:', companyId);
    console.log('👤 User data:', {
      id: req.user?._id,
      role: req.user?.role,
      userCompanyId: req.user?.companyId,
      userCompanyIdType: typeof req.user?.companyId,
    });

    if (!companyId) {
      console.log('❌ StatusStats: No companyId provided');
      return res.status(400).json({ error: 'CompanyId is required' });
    }

    // Проверяем валидность ObjectId
    if (!companyId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ StatusStats: Invalid companyId format:', companyId);
      return res.status(400).json({ error: 'Invalid companyId format' });
    }

    // Проверка доступа к компании
    if (req.user.role === 'superadmin') {
      console.log('✅ StatusStats: Superadmin access - allowed for any company');
    } else if (req.user.role === 'admin' || req.user.role === 'user') {
      let targetCompanyId;

      if (req.user.companyId) {
        // У пользователя есть назначенная компания
        targetCompanyId =
          typeof req.user.companyId === 'string'
            ? req.user.companyId
            : req.user.companyId._id || req.user.companyId.toString();
      } else if (req.user.role === 'admin' && companyId) {
        // Админ без назначенной компании может выбрать компанию
        targetCompanyId = companyId;
      } else {
        console.log('❌ StatusStats: User has no access to any company');
        return res.status(403).json({ error: 'Недостаточно прав для просмотра статусов' });
      }

      console.log('🔒 StatusStats: Access check:', {
        requestedCompanyId: companyId,
        userCompanyId: targetCompanyId,
        userRole: req.user.role,
        matches: targetCompanyId === companyId,
      });

      // Если запрашивается конкретная компания, проверяем права
      if (companyId && companyId !== targetCompanyId) {
        console.log('❌ StatusStats: Access denied to requested company');
        return res.status(403).json({ error: 'Нет доступа к статистике этой компании' });
      }
    } else {
      console.log('❌ StatusStats: Unknown user role');
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    console.log('🔍 StatusStats: Finding statuses for company:', companyId);
    // Получаем все статусы компании
    const statuses = await Status.find({
      companyId: companyId,
    }).sort({ order: 1 });

    console.log('✅ StatusStats: Found statuses:', statuses.length);

    // Получаем статистику по проектам для каждого статуса
    console.log('🔄 StatusStats: Calculating project counts...');
    const stats = await Promise.all(
      statuses.map(async (status) => {
        try {
          console.log(`📈 Counting projects for status ${status.name} (${status._id})`);
          // Используем более безопасный поиск проектов
          const projectCount = await Project.countDocuments({
            $or: [{ statusId: status._id }, { status: status.name, companyId: companyId }],
          });
          console.log(`✅ Status ${status.name}: ${projectCount} projects`);
          return {
            ...status.toObject(),
            projectCount,
          };
        } catch (statusError) {
          console.error(`❌ Error counting projects for status ${status.name}:`, statusError);
          return {
            ...status.toObject(),
            projectCount: 0,
          };
        }
      }),
    );

    console.log('✅ StatusStats: Completed, returning', stats.length, 'statuses');
    res.json(stats);
  } catch (err) {
    console.error('❌ StatusStats: Error in getStatusStats:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
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

// Создать дефолтные статусы для компании
exports.createDefaultStatuses = async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'CompanyId is required' });
    }

    // Проверяем, что компания существует
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Создаем дефолтные статусы
    const createdStatuses = await Status.createDefaultStatusesForCompany(companyId);

    res.status(201).json({
      message: `Created ${createdStatuses.length} default statuses for company ${company.name}`,
      createdStatuses,
      companyName: company.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
