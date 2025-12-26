'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Shipments', 'companyName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Company name for the shipment booking'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Shipments', 'companyName');
  }
};

