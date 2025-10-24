'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Shipments');

    if (!table.insurance) {
      await queryInterface.addColumn('Shipments', 'insurance', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!table.salesTax) {
      await queryInterface.addColumn('Shipments', 'salesTax', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!table.numberOfVehicles) {
      await queryInterface.addColumn('Shipments', 'numberOfVehicles', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Shipments');

    if (table.numberOfVehicles) {
      await queryInterface.removeColumn('Shipments', 'numberOfVehicles');
    }
    if (table.salesTax) {
      await queryInterface.removeColumn('Shipments', 'salesTax');
    }
    if (table.insurance) {
      await queryInterface.removeColumn('Shipments', 'insurance');
    }
  }
};