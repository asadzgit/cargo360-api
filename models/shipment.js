'use strict';
const { Model } = require('sequelize');
const { buildDiff, formatFieldName } = require('../src/utils/auditDiff');

const AUDIT_IGNORED_FIELDS = ['updatedAt', 'createdAt'];
const SYSTEM_USER_ID = -1;

const resolveUserId = (options = {}) => {
  if (options.userId === 0) return 0;
  if (typeof options.userId === 'number' && Number.isInteger(options.userId)) return options.userId;
  if (typeof options.userId === 'string' && options.userId.trim() !== '' && !Number.isNaN(Number(options.userId))) {
    return Number(options.userId);
  }
  return SYSTEM_USER_ID;
};

const getPlainSnapshot = (shipment) => {
  if (!shipment) return null;
  
  let plainData;
  if (typeof shipment.get === 'function') {
    plainData = shipment.get({ plain: true });
  } else if (typeof shipment.toJSON === 'function') {
    plainData = shipment.toJSON();
  } else {
    plainData = { ...shipment };
  }

  // Format field names to human-readable format
  const formatted = {};
  for (const [key, value] of Object.entries(plainData)) {
    if (AUDIT_IGNORED_FIELDS.includes(key)) continue;
    formatted[formatFieldName(key)] = value;
  }
  
  return formatted;
};

const logAuditEntry = async (shipment, options, operation, diff) => {
  if (!shipment || !diff) return;
  const ShipmentLog = shipment.sequelize?.models?.ShipmentLog;
  if (!ShipmentLog) return;

  await ShipmentLog.create({
    shipmentId: shipment.id,
    changedBy: resolveUserId(options),
    operation,
    diff
  }, { transaction: options?.transaction });
};

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

      // Shipment → Location Tracking
      Shipment.hasMany(models.ShipmentLocation, { foreignKey: 'shipmentId', as: 'Locations' });

      // Shipment → DiscountRequest (one-to-one)
      Shipment.hasOne(models.DiscountRequest, { foreignKey: 'shipmentId', as: 'DiscountRequest' });
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
      allowNull: true
    },
    cargoWeight: DataTypes.INTEGER,
    cargoSize: DataTypes.STRING,
    numberOfVehicles: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    vehicleType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    budget: DataTypes.DECIMAL,
    insurance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    salesTax: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('pending','confirmed','accepted','picked_up','in_transit','delivered','cancelled'),
      defaultValue: 'pending'
    },
    cancelReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cancelledBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    deliveryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    clearingAgentNum: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Shipment',
  });

  Shipment.addHook('afterCreate', async (shipment, options) => {
    await logAuditEntry(shipment, options, 'create', getPlainSnapshot(shipment));
  });

  Shipment.addHook('beforeUpdate', async (shipment, options) => {
    const changedFields = shipment.changed() || [];
    const diff = buildDiff(shipment._previousDataValues || {}, shipment.dataValues || {}, {
      ignore: AUDIT_IGNORED_FIELDS,
      fields: changedFields
    });

    if (!diff || !Object.keys(diff).length) {
      return;
    }

    await logAuditEntry(shipment, options, 'update', diff);
  });

  Shipment.addHook('beforeDestroy', async (shipment, options) => {
    await logAuditEntry(shipment, options, 'delete', getPlainSnapshot(shipment));
  });

  return Shipment;
};
