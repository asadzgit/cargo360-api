'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remove the global unique constraint on phone if it exists
    try {
      await queryInterface.removeIndex('Users', 'users_phone_unique');
      console.log('Removed users_phone_unique index');
    } catch (e) {
      console.log('users_phone_unique index does not exist, skipping removal');
    }

    // Also try to remove the constraint from the initial migration if it exists
    try {
      await queryInterface.removeConstraint('Users', 'Users_phone_key');
      console.log('Removed Users_phone_key constraint');
    } catch (e) {
      console.log('Users_phone_key constraint does not exist, skipping removal');
    }

    // 2. Add partial unique indexes for each role
    // Customer phone unique (among customers only)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_phone_customer_unique 
      ON "Users" (phone) 
      WHERE role = 'customer' AND phone IS NOT NULL;
    `);

    // Driver phone unique (among drivers only)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_phone_driver_unique 
      ON "Users" (phone) 
      WHERE role = 'driver' AND phone IS NOT NULL;
    `);

    // Trucker (broker) phone unique (among truckers only)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_phone_trucker_unique 
      ON "Users" (phone) 
      WHERE role = 'trucker' AND phone IS NOT NULL;
    `);

    // 3. Add exclusion constraint to prevent drivers and truckers from sharing phone numbers
    // This uses the btree_gist extension for exclusion constraints
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS btree_gist;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_phone_driver_trucker_exclusive 
      ON "Users" (phone) 
      WHERE (role = 'driver' OR role = 'trucker') AND phone IS NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove the role-based unique indexes
    try {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_phone_customer_unique;');
    } catch (e) {}
    
    try {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_phone_driver_unique;');
    } catch (e) {}
    
    try {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_phone_trucker_unique;');
    } catch (e) {}
    
    try {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_phone_driver_trucker_exclusive;');
    } catch (e) {}

    // Re-add the global unique constraint (restore to original state)
    try {
      await queryInterface.addIndex('Users', ['phone'], {
        unique: true,
        name: 'users_phone_unique'
      });
    } catch (e) {}
  }
};
