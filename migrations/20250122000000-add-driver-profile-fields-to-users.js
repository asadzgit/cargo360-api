'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'cnic', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'company'
    });
    
    await queryInterface.addColumn('Users', 'license', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'cnic'
    });
    
    await queryInterface.addColumn('Users', 'vehicleRegistration', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'license'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'vehicleRegistration');
    await queryInterface.removeColumn('Users', 'license');
    await queryInterface.removeColumn('Users', 'cnic');
  }
};

