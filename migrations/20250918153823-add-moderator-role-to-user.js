'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.ENUM('customer', 'trucker', 'admin', 'driver', 'moderator'),
      allowNull: false,
      defaultValue: 'customer'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.ENUM('customer', 'trucker', 'admin', 'driver'),
      allowNull: false,
      defaultValue: 'customer'
    });
  }
};
