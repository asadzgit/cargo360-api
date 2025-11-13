'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update the enum type to include 'confirmed' status
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Shipments_status" ADD VALUE IF NOT EXISTS 'confirmed';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This is a one-way migration for safety
    console.log('Removing enum values is not supported. Manual intervention required if rollback needed.');
  }
};
