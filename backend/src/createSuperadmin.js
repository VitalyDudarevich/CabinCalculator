const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/calculator');
  const passwordHash = await bcrypt.hash('Test123!', 10);
  const user = await User.findOne({ username: 'superadmin' });
  if (user) {
    console.log('Суперадмин уже существует:', user.email);
  } else {
    await User.create({
      username: 'superadmin',
      email: 'superadmin@example.com',
      passwordHash,
      role: 'superadmin',
      isEmailVerified: true,
    });
    console.log('Суперадмин создан!');
  }
  process.exit(0);
}

main();
