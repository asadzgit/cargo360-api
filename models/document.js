'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(models) {
      // Document belongs to ClearanceDocumentRequest (nullable for future reuse)
      Document.belongsTo(models.ClearanceDocumentRequest, { 
        foreignKey: 'requestId', 
        as: 'Request' 
      });

      // Document belongs to User (uploader)
      Document.belongsTo(models.User, { 
        foreignKey: 'uploadedBy', 
        as: 'Uploader' 
      });
    }
  }
  Document.init({
    requestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'requestId'
    },
    documentType: {
      type: DataTypes.ENUM(
        'commercial_invoice',
        'packing_list',
        'bill_of_lading',
        'insurance',
        'pol',
        'pod',
        'product',
        'ex_works',
        'others'
      ),
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fileKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
    underscored: false,
    timestamps: true
  });
  return Document;
};

