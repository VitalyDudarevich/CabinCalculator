db = db.getSiblingDB('calculator');
db.users.insertOne({
  username: 'superadmin',
  email: 'superadmin@example.com',
  passwordHash: '$2b$10$6Qw6Qw6Qw6Qw6Qw6Qw6QwOeQw6Qw6Qw6Qw6Qw6Qw6Qw6Qw6Qw6Qw6Qw6',
  role: 'superadmin',
  companyId: null,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  __v: 0,
});
