'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BrokerDrivers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      brokerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      driverId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add unique constraint to prevent duplicate broker-driver pairs
    await queryInterface.addIndex('BrokerDrivers', ['brokerId', 'driverId'], {
      unique: true,
      name: 'broker_driver_unique'
    });

    // Migrate existing broker-driver relationships from brokerId field in Users table
    await queryInterface.sequelize.query(`
      INSERT INTO "BrokerDrivers" ("brokerId", "driverId", "createdAt", "updatedAt")
      SELECT "brokerId", "id", NOW(), NOW()
      FROM "Users"
      WHERE "brokerId" IS NOT NULL AND "role" = 'driver'
      ON CONFLICT DO NOTHING;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BrokerDrivers');
  }
};
