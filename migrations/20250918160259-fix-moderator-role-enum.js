'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, add the new enum value to the existing enum type, only if it does not already exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_Users_role'
            AND e.enumlabel = 'moderator'
        ) THEN
          ALTER TYPE "enum_Users_role" ADD VALUE 'moderator';
        END IF;
      END
      $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // You would need to recreate the enum type without 'moderator'
    // For now, we'll leave this empty as it's complex to reverse
    console.log('Cannot easily  remove enum value in PostgreSQL. Manual intervention required.');
  }
};
