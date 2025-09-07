'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Shipment extends Model {
    static associate(models) {
      // Shipment belongs to a Customer
      Shipment.belongsTo(models.User, { foreignKey: 'customerId', as: 'Customer' });

      // Shipment belongs to a Trucker
      Shipment.belongsTo(models.User, { foreignKey: 'truckerId', as: 'Trucker' });

      // Shipment → Reviews
      Shipment.hasMany(models.Review, { foreignKey: 'shipmentId', as: 'Reviews' });
    }
  }
  Shipment.init({
    customerId: DataTypes.INTEGER,
    truckerId: DataTypes.INTEGER,
    pickupLocation: DataTypes.TEXT,
    dropLocation: DataTypes.TEXT,
    cargoType: DataTypes.STRING,
    cargoWeight: DataTypes.INTEGER,
    cargoSize: DataTypes.STRING,
    vehicleType: DataTypes.STRING,
    budget: DataTypes.DECIMAL,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Shipment',
  });
  return Shipment;
};
