'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Vehicles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      truckerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      vehicleType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      make: Sequelize.STRING,
      model: Sequelize.STRING,
      year: Sequelize.INTEGER,
      color: Sequelize.STRING,
      registrationNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      chassisNumber: Sequelize.STRING,
      engineNumber: Sequelize.STRING,
      capacityKg: Sequelize.INTEGER,
      dimensions: Sequelize.STRING,
      rcDocumentUrl: Sequelize.STRING,
      insuranceDocumentUrl: Sequelize.STRING,
      permitDocumentUrl: Sequelize.STRING,
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'active'
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
    await queryInterface.dropTable('Vehicles');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Vehicles_status";'); // cleanup ENUM
  }
};
