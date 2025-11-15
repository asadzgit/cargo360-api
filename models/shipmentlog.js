'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ShipmentLog extends Model {
    static associate(models) {
      ShipmentLog.belongsTo(models.Shipment, { foreignKey: 'shipmentId', as: 'Shipment' });
    }
  }

  ShipmentLog.init({
    shipmentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: -1
    },
    operation: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['create', 'update', 'delete']]
      }
    },
    diff: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'ShipmentLog',
    tableName: 'ShipmentLogs'
  });
  return ShipmentLog;
};