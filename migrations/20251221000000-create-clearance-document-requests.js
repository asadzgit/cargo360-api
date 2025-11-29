'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clearance_document_requests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      shipmentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Shipments',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      requestType: {
        type: Sequelize.ENUM('import', 'export', 'freight_forwarding'),
        allowNull: false
      },
      city: {
        type: Sequelize.ENUM('LHR', 'KHI'),
        allowNull: true,
        comment: 'Only for import/export requests'
      },
      transportMode: {
        type: Sequelize.ENUM('air', 'sea', 'air_only'),
        allowNull: true,
        comment: 'Transport mode for import/export'
      },
      containerType: {
        type: Sequelize.ENUM('LCL', 'FCL'),
        allowNull: false
      },
      port: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Port selection for KHI (KGT/PICT, KICT, SAPT, etc.)'
      },
      cbm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Cubic meters for LCL freight forwarding'
      },
      packages: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of packages for LCL freight forwarding'
      },
      containerSize: {
        type: Sequelize.ENUM('20ft', '40ft', 'reefer'),
        allowNull: true,
        comment: 'Container size for FCL freight forwarding'
      },
      numberOfContainers: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of containers for FCL freight forwarding'
      },
      pol: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Port of Loading'
      },
      pod: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Port of Discharge'
      },
      product: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Product/Items'
      },
      incoterms: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Incoterms (e.g., FOB, CFR, Ex-Works)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'under_review', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      reviewedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      reviewNotes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add indexes for common queries
    await queryInterface.addIndex('clearance_document_requests', ['shipmentId'], {
      name: 'clearance_requests_shipment_id_idx'
    });

    await queryInterface.addIndex('clearance_document_requests', ['createdBy'], {
      name: 'clearance_requests_created_by_idx'
    });

    await queryInterface.addIndex('clearance_document_requests', ['status'], {
      name: 'clearance_requests_status_idx'
    });

    await queryInterface.addIndex('clearance_document_requests', ['requestType'], {
      name: 'clearance_requests_type_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('clearance_document_requests');
    // Cleanup ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clearance_document_requests_requestType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clearance_document_requests_city";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clearance_document_requests_transportMode";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clearance_document_requests_containerType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clearance_document_requests_containerSize";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_clearance_document_requests_status";');
  }
};

