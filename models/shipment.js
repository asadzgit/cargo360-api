'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Shipment extends Model {
    static associate(models) {
      // Shipment belongs to a Customer
      Shipment.belongsTo(models.User, { foreignKey: 'customerId', as: 'Customer' });

      // Shipment belongs to a Trucker
      Shipment.belongsTo(models.User, { foreignKey: 'truckerId', as: 'Trucker' });

      // Shipment belongs to a Driver
      Shipment.belongsTo(models.User, { foreignKey: 'driverId', as: 'Driver' });

      // Shipment → Reviews
      Shipment.hasMany(models.Review, { foreignKey: 'shipmentId', as: 'Reviews' });
    }
  }
  Shipment.init({
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    truckerId: DataTypes.INTEGER,
    driverId: DataTypes.INTEGER,
    pickupLocation: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dropLocation: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cargoType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cargoWeight: DataTypes.INTEGER,
    cargoSize: DataTypes.STRING,
    vehicleType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    budget: DataTypes.DECIMAL,
    status: {
      type: DataTypes.ENUM('pending','accepted','picked_up','in_transit','delivered','cancelled'),
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'Shipment',
  });
  return Shipment;
};
