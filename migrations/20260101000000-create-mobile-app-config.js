'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MobileAppConfigs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      platform: {
        type: Sequelize.ENUM('android', 'ios'),
        allowNull: false,
        unique: true
      },
      minSupportedVersion: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Minimum supported version (semantic version format: x.y.z)'
      },
      latestVersion: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Latest available version (semantic version format: x.y.z)'
      },
      forceUpdate: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, force update for versions below minSupportedVersion'
      },
      storeUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Store URL for the app (Play Store / App Store)'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Insert initial Android configuration
    await queryInterface.bulkInsert('MobileAppConfigs', [{
      platform: 'android',
      minSupportedVersion: '1.1.3',
      latestVersion: '1.1.3',
      forceUpdate: false,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.cargo360.app&pcampaignid=web_share',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('MobileAppConfigs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_MobileAppConfigs_platform";');
  }
};


