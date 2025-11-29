'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClearanceDocumentRequest extends Model {
    static associate(models) {
      // ClearanceDocumentRequest belongs to a Shipment (nullable)
      ClearanceDocumentRequest.belongsTo(models.Shipment, { 
        foreignKey: 'shipmentId', 
        as: 'Shipment' 
      });

      // ClearanceDocumentRequest belongs to User (creator)
      ClearanceDocumentRequest.belongsTo(models.User, { 
        foreignKey: 'createdBy', 
        as: 'Creator' 
      });

      // ClearanceDocumentRequest belongs to User (reviewer, nullable)
      ClearanceDocumentRequest.belongsTo(models.User, { 
        foreignKey: 'reviewedBy', 
        as: 'Reviewer' 
      });

      // ClearanceDocumentRequest has many Documents
      ClearanceDocumentRequest.hasMany(models.Document, { 
        foreignKey: 'requestId', 
        as: 'Documents' 
      });
    }
  }
  ClearanceDocumentRequest.init({
    shipmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'shipmentId'
    },
    requestType: {
      type: DataTypes.ENUM('import', 'export', 'freight_forwarding'),
      allowNull: false
    },
    city: {
      type: DataTypes.ENUM('LHR', 'KHI'),
      allowNull: true
    },
    transportMode: {
      type: DataTypes.ENUM('air', 'sea', 'air_only'),
      allowNull: true
    },
    containerType: {
      type: DataTypes.ENUM('LCL', 'FCL'),
      allowNull: false
    },
    port: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cbm: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    packages: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    containerSize: {
      type: DataTypes.ENUM('20ft', '40ft', 'reefer'),
      allowNull: true
    },
    numberOfContainers: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pol: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    product: {
      type: DataTypes.STRING,
      allowNull: true
    },
    incoterms: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ClearanceDocumentRequest',
    tableName: 'clearance_document_requests',
    underscored: false,
    timestamps: true
  });
  return ClearanceDocumentRequest;
};

