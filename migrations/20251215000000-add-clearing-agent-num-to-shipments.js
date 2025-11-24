'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Shipments', 'clearingAgentNum', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Clearing Agent Number for the shipment'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Shipments', 'clearingAgentNum');
  }
};

