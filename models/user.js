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
    role: {
      type: DataTypes.ENUM('customer', 'trucker', 'admin', 'driver'),
      allowNull: false,
      defaultValue: 'customer'
    },
    isApproved: DataTypes.BOOLEAN,
    isEmailVerified: DataTypes.BOOLEAN,
    emailVerificationToken: DataTypes.STRING,
    emailVerificationExpires: DataTypes.DATE,
    passwordResetToken: DataTypes.STRING,
    passwordResetExpires: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
