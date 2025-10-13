'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DiscountRequest extends Model {
    static associate(models) {
      DiscountRequest.belongsTo(models.Shipment, { foreignKey: 'shipmentId', as: 'Shipment' });
    }
  }
  DiscountRequest.init({
    shipmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Shipments',
        key: 'id'
      }
    },
    requestAmount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending','accepted','rejected'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'DiscountRequest',
  });
  return DiscountRequest;
};
