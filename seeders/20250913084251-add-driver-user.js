'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await queryInterface.bulkInsert('Users', [{
      name: 'John Driver',
      email: 'john.driver@example.com',
      phone: '5551234567',
      passwordHash: passwordHash,
      role: 'driver',
      isApproved: true,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', {
      email: 'john.driver@example.com'
    }, {});
  }
};
