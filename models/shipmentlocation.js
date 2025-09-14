'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ShipmentLocation extends Model {
    static associate(models) {
      // Define associations here
      ShipmentLocation.belongsTo(models.Shipment, {
        foreignKey: 'shipmentId',
        as: 'Shipment'
      });
      
      ShipmentLocation.belongsTo(models.User, {
        foreignKey: 'driverId',
        as: 'Driver'
      });
    }
  }
  
  ShipmentLocation.init({
    shipmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Shipments',
        key: 'id'
      }
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: -180,
        max: 180
      }
    },
    accuracy: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    speed: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    heading: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 360
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ShipmentLocation',
    tableName: 'ShipmentLocations',
    indexes: [
      {
        fields: ['shipmentId']
      },
      {
        fields: ['driverId']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['shipmentId', 'timestamp']
      }
    ]
  });
  
  return ShipmentLocation;
};
