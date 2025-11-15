'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ShipmentLogs', {
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
      changedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: -1
      },
      operation: {
        type: Sequelize.STRING,
        allowNull: false
      },
      diff: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
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

    await queryInterface.addIndex('ShipmentLogs', ['shipmentId']);
    await queryInterface.addIndex('ShipmentLogs', ['createdAt']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ShipmentLogs');
  }
};