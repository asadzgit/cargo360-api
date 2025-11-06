'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BrokerDriver extends Model {
    static associate(models) {
      // BrokerDriver belongs to User (broker)
      BrokerDriver.belongsTo(models.User, { foreignKey: 'brokerId', as: 'Broker' });
      
      // BrokerDriver belongs to User (driver)
      BrokerDriver.belongsTo(models.User, { foreignKey: 'driverId', as: 'Driver' });
    }
  }
  
  BrokerDriver.init({
    brokerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'BrokerDriver',
  });
  
  return BrokerDriver;
};


