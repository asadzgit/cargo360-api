'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');
    
    if (!table.hasSignedUp) {
      await queryInterface.addColumn('Users', 'hasSignedUp', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indicates if the driver has signed up/registered their account'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');
    
    if (table.hasSignedUp) {
      await queryInterface.removeColumn('Users', 'hasSignedUp');
    }
  }
};

