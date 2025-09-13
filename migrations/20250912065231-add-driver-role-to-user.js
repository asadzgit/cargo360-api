'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add 'driver' to the existing role ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Users_role" ADD VALUE 'driver';
    `);
  },

  async down (queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing ENUM values directly
    // This would require recreating the ENUM type and updating all references
    // For now, we'll leave a comment about the limitation
    
    // To properly rollback, you would need to:
    // 1. Create a new ENUM without 'driver'
    // 2. Update all Users with role='driver' to another role
    // 3. Alter the column to use the new ENUM
    // 4. Drop the old ENUM
    
    throw new Error('Cannot rollback ENUM value addition in PostgreSQL. Manual intervention required.');
  }
};
