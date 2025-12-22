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

      // 👤 Many-to-many broker-driver relationship through BrokerDriver junction table
      User.belongsToMany(models.User, { 
        through: models.BrokerDriver,
        as: 'Brokers',
        foreignKey: 'driverId',
        otherKey: 'brokerId'
      });
      User.belongsToMany(models.User, { 
        through: models.BrokerDriver,
        as: 'Drivers',
        foreignKey: 'brokerId',
        otherKey: 'driverId'
      });

      // Keep old brokerId field for backward compatibility (will be deprecated)
      User.belongsTo(models.User, { as: 'PrimaryBroker', foreignKey: 'brokerId' });

      // 📱 User → DeviceTokens
      User.hasMany(models.DeviceToken, { foreignKey: 'userId', as: 'DeviceTokens' });

      // 🔔 User → Notifications
      User.hasMany(models.Notification, { foreignKey: 'userId', as: 'Notifications' });
    }
  }
  User.init({
    name: DataTypes.STRING,
    company: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING, // should be UNIQUE at DB level
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true
    },// stores 6-digit PIN hash for phone logins
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
    brokerId: DataTypes.INTEGER,
    // 📄 Driver profile fields
    cnic: DataTypes.STRING,
    license: DataTypes.STRING,
    vehicleRegistration: DataTypes.STRING,
    // ✅ Driver signup status
    hasSignedUp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
