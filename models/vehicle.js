'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Vehicle extends Model {
    static associate(models) {
      // Each Vehicle belongs to a Trucker (User)
      Vehicle.belongsTo(models.User, { foreignKey: 'truckerId', as: 'Trucker' });
    }
  }
  Vehicle.init({
    truckerId: DataTypes.INTEGER,
    vehicleType: DataTypes.STRING,
    make: DataTypes.STRING,
    model: DataTypes.STRING,
    year: DataTypes.INTEGER,
    color: DataTypes.STRING,
    registrationNumber: DataTypes.STRING,
    chassisNumber: DataTypes.STRING,
    engineNumber: DataTypes.STRING,
    capacityKg: DataTypes.INTEGER,
    dimensions: DataTypes.STRING,
    rcDocumentUrl: DataTypes.STRING,
    insuranceDocumentUrl: DataTypes.STRING,
    permitDocumentUrl: DataTypes.STRING,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Vehicle',
  });
  return Vehicle;
};
