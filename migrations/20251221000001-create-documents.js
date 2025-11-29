'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      requestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'clearance_document_requests',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'FK to clearance_document_requests (nullable for future reuse)'
      },
      documentType: {
        type: Sequelize.ENUM(
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
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Original filename'
      },
      fileUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'S3/cloud storage URL (will be populated when S3 is set up)'
      },
      fileKey: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'S3 key for file deletion (will be populated when S3 is set up)'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes'
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'MIME type (e.g., application/pdf, image/jpeg)'
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add indexes
    await queryInterface.addIndex('documents', ['requestId'], {
      name: 'documents_request_id_idx'
    });

    await queryInterface.addIndex('documents', ['uploadedBy'], {
      name: 'documents_uploaded_by_idx'
    });

    await queryInterface.addIndex('documents', ['documentType'], {
      name: 'documents_type_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('documents');
    // Cleanup ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_documents_documentType";');
  }
};

