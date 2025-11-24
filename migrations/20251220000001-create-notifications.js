'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    // Add index on user_id for faster queries
    await queryInterface.addIndex('notifications', ['user_id'], {
      name: 'notifications_user_id_idx'
    });

    // Add index on is_read for filtering unread notifications
    await queryInterface.addIndex('notifications', ['user_id', 'is_read'], {
      name: 'notifications_user_read_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  }
};

