'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Shipments', 'cancelReason', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      after: 'status'
    });

    await queryInterface.addColumn('Shipments', 'cancelledBy', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      after: 'cancelReason'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Shipments', 'cancelReason');
    await queryInterface.removeColumn('Shipments', 'cancelledBy');
  }
};

