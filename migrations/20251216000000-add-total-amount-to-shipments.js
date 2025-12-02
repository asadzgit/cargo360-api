'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Shipments', 'totalAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Final amount after discount (budget - discount)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Shipments', 'totalAmount');
  }
};

