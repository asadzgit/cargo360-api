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

      // 👤 Broker-driver hierarchy
      User.belongsTo(models.User, { as: 'Broker', foreignKey: 'brokerId' });
      User.hasMany(models.User, { as: 'Drivers', foreignKey: 'brokerId' });
    }
  }
  User.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING, // should be UNIQUE at DB level
    passwordHash: DataTypes.STRING, // stores 6-digit PIN hash for phone logins
    role: {
      type: DataTypes.ENUM('customer', 'trucker', 'admin', 'driver', 'moderator'),
      allowNull: false,
      defaultValue: 'customer'
    },
    isApproved: DataTypes.BOOLEAN,
    isEmailVerified: DataTypes.BOOLEAN,
    emailVerificationToken: DataTypes.STRING,
    emailVerificationExpires: DataTypes.DATE,
    passwordResetToken: DataTypes.STRING,
    passwordResetExpires: DataTypes.DATE,
    // 📱 Phone-OTP flow
    otpCode: DataTypes.STRING,          // 6-digit code
    otpExpires: DataTypes.DATE,
    isPhoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // 🔗 Broker linkage for drivers
    brokerId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
