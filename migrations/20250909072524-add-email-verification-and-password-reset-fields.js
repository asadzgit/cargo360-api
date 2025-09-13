'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'isEmailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('Users', 'emailVerificationToken', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'emailVerificationExpires', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'passwordResetToken', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'passwordResetExpires', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'isEmailVerified');
    await queryInterface.removeColumn('Users', 'emailVerificationToken');
    await queryInterface.removeColumn('Users', 'emailVerificationExpires');
    await queryInterface.removeColumn('Users', 'passwordResetToken');
    await queryInterface.removeColumn('Users', 'passwordResetExpires');
  }
};
