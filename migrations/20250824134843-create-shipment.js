'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Shipments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      truckerId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      pickupLocation: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      dropLocation: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      cargoType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cargoWeight: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      cargoSize: {
        type: Sequelize.STRING
      },
      vehicleType: {
        type: Sequelize.STRING
      },
      budget: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending','accepted','picked_up','in_transit','delivered','cancelled'),
        defaultValue: 'pending'
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Shipments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Shipments_status";');
  }
};
