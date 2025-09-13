'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Make vehicleType required (NOT NULL)
    await queryInterface.changeColumn('Shipments', 'vehicleType', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // Make cargoWeight optional (allow NULL)
    await queryInterface.changeColumn('Shipments', 'cargoWeight', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert: Make cargoWeight required again
    await queryInterface.changeColumn('Shipments', 'cargoWeight', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    // Revert: Make vehicleType optional again
    await queryInterface.changeColumn('Shipments', 'vehicleType', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
