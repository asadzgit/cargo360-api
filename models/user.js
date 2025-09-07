'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 🚚 User (trucker) → Vehicles
      User.hasMany(models.Vehicle, { foreignKey: 'truckerId', as: 'Vehicles' });

      // 📦 User (customer) → Shipments
      User.hasMany(models.Shipment, { foreignKey: 'customerId', as: 'CustomerShipments' });

      // 🚛 User (trucker) → Shipments
      User.hasMany(models.Shipment, { foreignKey: 'truckerId', as: 'TruckerShipments' });

      // 📝 User → Reviews (as reviewer and reviewee)
      User.hasMany(models.Review, { foreignKey: 'reviewerId', as: 'ReviewsGiven' });
      User.hasMany(models.Review, { foreignKey: 'revieweeId', as: 'ReviewsReceived' });
    }
  }
  User.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    role: DataTypes.STRING, // ENUM handled in migration
    isApproved: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
