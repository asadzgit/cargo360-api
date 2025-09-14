'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ShipmentLocations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      shipmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Shipments',
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
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      accuracy: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
        comment: 'GPS accuracy in meters'
      },
      speed: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Speed in km/h'
      },
      heading: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Direction in degrees (0-360)'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'GPS timestamp from device'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('ShipmentLocations', ['shipmentId']);
    await queryInterface.addIndex('ShipmentLocations', ['driverId']);
    await queryInterface.addIndex('ShipmentLocations', ['timestamp']);
    await queryInterface.addIndex('ShipmentLocations', ['shipmentId', 'timestamp']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ShipmentLocations');
  }
};
