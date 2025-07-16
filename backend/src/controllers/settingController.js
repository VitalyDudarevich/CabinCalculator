const Setting = require('../models/Setting');

exports.getAllSettings = async (req, res) => {
  try {
    const { companyId } = req.query;

    console.log('⚙️ getAllSettings called with:', {
      companyId,
      userRole: req.user?.role,
      userCompanyId: req.user?.companyId,
      hasCompanyId: !!req.user?.companyId,
    });

    // 🔧 УПРОЩЕННАЯ ЛОГИКА (как в hardwareController)
    const userCompanyId = req.user?.companyId;
    const queryCompanyId = req.query.companyId;
    const finalCompanyId = queryCompanyId || userCompanyId;

    console.log('🔧 УПРОЩЕННАЯ ПРОВЕРКА SETTINGS:', {
      userCompanyId,
      queryCompanyId,
      finalCompanyId,
      userRole: req.user?.role,
    });

    // Проверяем права доступа
    if (req.user.role === 'superadmin') {
      console.log('✅ Settings: Superadmin access - allowed for any company');
      // Суперадмин может получить настройки любой компании
      if (finalCompanyId) {
        const setting = await Setting.findOne({ companyId: finalCompanyId });
        return res.json(setting ? [setting] : []);
      } else {
        const settings = await Setting.find();
        return res.json(settings);
      }
    }

    // Для админов и пользователей
    if (req.user.role === 'admin' || req.user.role === 'user') {
      console.log('✅ Settings: User/Admin access with finalCompanyId:', finalCompanyId);

      if (!finalCompanyId) {
        console.log('❌ Settings: No companyId available');
        return res.status(403).json({ error: 'Недостаточно прав для просмотра настроек' });
      }

      console.log('✅ Settings: Loading settings for company:', finalCompanyId);
      const setting = await Setting.findOne({ companyId: finalCompanyId });
      return res.json(setting ? [setting] : []);
    }

    // Неизвестная роль
    console.log('❌ Settings: Unknown user role');
    return res.status(403).json({ error: 'Недостаточно прав' });
  } catch (err) {
    console.error('❌ Error in getAllSettings:', err);
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

    console.log('⚙️ createSetting called with:', {
      companyId,
      userRole: req.user?.role,
      userCompanyId: req.user?.companyId,
    });

    // Проверяем права доступа
    if (req.user.role === 'superadmin') {
      // Суперадмин может создавать настройки для любой компании
    } else if (req.user.role === 'admin' || req.user.role === 'user') {
      let userCompanyId;

      // Корректно извлекаем companyId пользователя
      if (req.user.companyId) {
        userCompanyId =
          typeof req.user.companyId === 'object'
            ? req.user.companyId._id?.toString() || req.user.companyId.toString()
            : req.user.companyId.toString();
      }

      if (!userCompanyId) {
        console.log('❌ Settings create: User has no access to any company');
        return res.status(403).json({ error: 'Недостаточно прав для создания настроек' });
      }

      console.log('🔍 Company ID comparison for create:', {
        userCompanyId,
        requestedCompanyId: companyId,
        match: companyId === userCompanyId,
      });

      if (companyId !== userCompanyId) {
        console.log('❌ Settings create: Access denied to company', companyId);
        return res.status(403).json({ error: 'Нет доступа к настройкам этой компании' });
      }
    } else {
      console.log('❌ Settings create: Unknown user role');
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

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
    console.error('❌ Error in createSetting:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    console.log('⚙️ updateSetting called with:', {
      settingId: req.params.id,
      userRole: req.user?.role,
      userCompanyId: req.user?.companyId,
    });

    // Сначала найдем настройку чтобы проверить companyId
    const existingSetting = await Setting.findById(req.params.id);
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Проверяем права доступа
    if (req.user.role === 'superadmin') {
      // Суперадмин может обновлять настройки любой компании
    } else if (req.user.role === 'admin' || req.user.role === 'user') {
      let userCompanyId;

      // Корректно извлекаем companyId пользователя
      if (req.user.companyId) {
        userCompanyId =
          typeof req.user.companyId === 'object'
            ? req.user.companyId._id?.toString() || req.user.companyId.toString()
            : req.user.companyId.toString();
      }

      if (!userCompanyId) {
        console.log('❌ Settings update: User has no access to any company');
        return res.status(403).json({ error: 'Недостаточно прав для обновления настроек' });
      }

      // Корректно извлекаем companyId настройки
      const settingCompanyId = existingSetting.companyId.toString();

      console.log('🔍 Company ID comparison:', {
        userCompanyId,
        settingCompanyId,
        match: userCompanyId === settingCompanyId,
      });

      if (settingCompanyId !== userCompanyId) {
        console.log('❌ Settings update: Access denied to company', settingCompanyId);
        return res.status(403).json({ error: 'Нет доступа к настройкам этой компании' });
      }
    } else {
      console.log('❌ Settings update: Unknown user role');
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

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
    console.error('❌ Error in updateSetting:', err);
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
