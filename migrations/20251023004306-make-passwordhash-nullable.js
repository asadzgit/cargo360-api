'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Make Users.passwordHash nullable to support phone-based signup without PIN
    await queryInterface.changeColumn('Users', 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert to NOT NULL if you previously enforced it
    await queryInterface.changeColumn('Users', 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};