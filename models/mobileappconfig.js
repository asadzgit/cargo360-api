'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MobileAppConfig extends Model {
    static associate(models) {
      // No associations needed for this config table
    }
  }
  
  MobileAppConfig.init({
    platform: {
      type: DataTypes.ENUM('android', 'ios'),
      allowNull: false,
      unique: true,
      validate: {
        isIn: [['android', 'ios']]
      }
    },
    minSupportedVersion: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^\d+\.\d+\.\d+$/
      }
    },
    latestVersion: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^\d+\.\d+\.\d+$/
      }
    },
    forceUpdate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    storeUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        isUrl: true
      }
    }
  }, {
    sequelize,
    modelName: 'MobileAppConfig',
    tableName: 'MobileAppConfigs',
    indexes: [
      {
        unique: true,
        fields: ['platform']
      }
    ]
  });
  
  return MobileAppConfig;
};


