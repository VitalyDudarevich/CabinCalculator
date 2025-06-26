const mongoose = require('mongoose');
const Project = require('../models/Project');

// Подключение к базе данных
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calculator', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanStatusHistory() {
  try {
    console.log('🔄 Starting cleanup of statusHistory...');

    // Найти все проекты с записями в statusHistory без statusId
    const projects = await Project.find({
      'statusHistory.0': { $exists: true },
    });

    console.log(`📊 Found ${projects.length} projects with statusHistory`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        // Фильтруем записи - оставляем только те, где есть statusId
        const validStatusHistory = project.statusHistory.filter(
          (entry) => entry.statusId && mongoose.Types.ObjectId.isValid(entry.statusId),
        );

        const originalLength = project.statusHistory.length;
        const newLength = validStatusHistory.length;

        if (originalLength !== newLength) {
          console.log(
            `📝 Project ${project._id} (${project.name || 'Unnamed'}): removing ${originalLength - newLength} invalid entries`,
          );

          project.statusHistory = validStatusHistory;
          await project.save();
          cleanedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing project ${project._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Cleanup completed:`);
    console.log(`   - Projects cleaned: ${cleanedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total projects processed: ${projects.length}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Запуск миграции
cleanStatusHistory();
