'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      // Notification belongs to a User
      Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
    }
  }
  Notification.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read'
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    underscored: false,
    timestamps: true
  });
  return Notification;
};

