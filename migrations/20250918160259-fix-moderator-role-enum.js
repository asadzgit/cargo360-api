'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, add the new enum value to the existing enum type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Users_role" ADD VALUE 'moderator';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // You would need to recreate the enum type without 'moderator'
    // For now, we'll leave this empty as it's complex to reverse
    console.log('Cannot easily remove enum value in PostgreSQL. Manual intervention required.');
  }
};
