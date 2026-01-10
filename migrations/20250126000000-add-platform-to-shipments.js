'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the enum type first (if it doesn't exist)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Shipments_platform" AS ENUM('web', 'mobile');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Check if column already exists using describeTable
    const tableDescription = await queryInterface.describeTable('Shipments');
    
    if (!tableDescription.platform) {
      // Add the column using raw SQL to use the enum type we just created
      await queryInterface.sequelize.query(`
        ALTER TABLE "Shipments" 
        ADD COLUMN "platform" "enum_Shipments_platform" NULL;
        
        COMMENT ON COLUMN "Shipments"."platform" IS 'Platform from which the booking form was submitted (web: cargo360-client-portal, mobile: cargo360-client-app)';
      `);
    } else {
      console.log('Column "platform" already exists in "Shipments" table. Skipping column creation.');
      // Ensure the column has the correct comment (update if needed)
      try {
        await queryInterface.sequelize.query(`
          COMMENT ON COLUMN "Shipments"."platform" IS 'Platform from which the booking form was submitted (web: cargo360-client-portal, mobile: cargo360-client-app)';
        `);
      } catch (err) {
        // Ignore if comment already exists or can't be set
        console.log('Note: Could not update column comment (may already be set).');
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Shipments', 'platform');
    // Drop the enum type if no other columns use it
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Shipments_platform";');
  }
};

