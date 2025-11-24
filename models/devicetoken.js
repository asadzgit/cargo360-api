'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceToken extends Model {
    static associate(models) {
      // DeviceToken belongs to a User
      DeviceToken.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
    }
  }
  DeviceToken.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    expoPushToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'expo_push_token'
    }
  }, {
    sequelize,
    modelName: 'DeviceToken',
    tableName: 'device_tokens',
    underscored: false,
    timestamps: true
  });
  return DeviceToken;
};

