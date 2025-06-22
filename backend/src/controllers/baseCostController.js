const BaseCost = require('../models/BaseCost');

// Получить все базовые стоимости для компании
exports.getBaseCosts = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId обязателен' });
    }

    const baseCosts = await BaseCost.find({ companyId }).sort({ name: 1 });
    res.json(baseCosts);
  } catch (error) {
    console.error('Ошибка получения базовых стоимостей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Обновить все базовые стоимости для компании (замена)
exports.updateBaseCosts = async (req, res) => {
  try {
    const { companyId } = req.query;
    const baseCosts = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId обязателен' });
    }

    if (!Array.isArray(baseCosts)) {
      return res.status(400).json({ error: 'Ожидается массив базовых стоимостей' });
    }

    // Удаляем все существующие базовые стоимости для компании
    await BaseCost.deleteMany({ companyId });

    // Создаем новые
    const newBaseCosts = [];
    for (const item of baseCosts) {
      if (item.name && item.name.trim()) {
        const baseCost = new BaseCost({
          name: item.name.trim(),
          value: typeof item.value === 'number' ? item.value : 0,
          companyId,
        });
        newBaseCosts.push(baseCost);
      }
    }

    if (newBaseCosts.length > 0) {
      await BaseCost.insertMany(newBaseCosts);
    }

    // Возвращаем обновленный список
    const updatedBaseCosts = await BaseCost.find({ companyId }).sort({ name: 1 });
    res.json(updatedBaseCosts);
  } catch (error) {
    console.error('Ошибка обновления базовых стоимостей:', error);

    if (error.code === 11000) {
      return res.status(400).json({ error: 'Базовая стоимость с таким названием уже существует' });
    }

    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Добавить одну базовую стоимость
exports.addBaseCost = async (req, res) => {
  try {
    const { name, value, companyId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название обязательно' });
    }

    if (!companyId) {
      return res.status(400).json({ error: 'companyId обязателен' });
    }

    const baseCost = new BaseCost({
      name: name.trim(),
      value: typeof value === 'number' ? value : 0,
      companyId,
    });

    await baseCost.save();
    res.json(baseCost);
  } catch (error) {
    console.error('Ошибка добавления базовой стоимости:', error);

    if (error.code === 11000) {
      return res.status(400).json({ error: 'Базовая стоимость с таким названием уже существует' });
    }

    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Удалить базовую стоимость
exports.deleteBaseCost = async (req, res) => {
  try {
    const { id } = req.params;

    const baseCost = await BaseCost.findByIdAndDelete(id);

    if (!baseCost) {
      return res.status(404).json({ error: 'Базовая стоимость не найдена' });
    }

    res.json({ message: 'Базовая стоимость удалена' });
  } catch (error) {
    console.error('Ошибка удаления базовой стоимости:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
