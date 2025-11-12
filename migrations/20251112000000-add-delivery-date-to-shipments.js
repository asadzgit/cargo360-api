'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Shipments', 'deliveryDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Expected delivery date in YYYY-MM-DD format'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Shipments', 'deliveryDate');
  }
};

