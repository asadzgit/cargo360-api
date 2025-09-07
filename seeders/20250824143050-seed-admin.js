'use strict';

const bcrypt = require('bcryptjs');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
 async up(queryInterface) {
    const hash = await bcrypt.hash('Admin@123', 10);
    return queryInterface.bulkInsert('Users', [{
      name: 'Super Admin',
      email: 'admin@demo.com',
      phone: '0000000000',
      passwordHash: hash,
      role: 'admin',
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },
  async down(queryInterface) {
    return queryInterface.bulkDelete('Users', { email: 'admin@demo.com' });
  }
};
