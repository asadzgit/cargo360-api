'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Add columns only if they do not exist
    const table = await queryInterface.describeTable('Users');

    if (!table.otpCode) {
      await queryInterface.addColumn('Users', 'otpCode', { type: Sequelize.STRING, allowNull: true });
    }
    if (!table.otpExpires) {
      await queryInterface.addColumn('Users', 'otpExpires', { type: Sequelize.DATE, allowNull: true });
    }
    if (!table.isPhoneVerified) {
      await queryInterface.addColumn('Users', 'isPhoneVerified', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    }
    if (!table.brokerId) {
      await queryInterface.addColumn('Users', 'brokerId', { type: Sequelize.INTEGER, allowNull: true });
    }

    // 2) Add FK constraint only if not exists (Postgres)
    // Name used earlier: fk_users_brokerId_users_id
    const [fkRows] = await queryInterface.sequelize.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'fk_users_brokerId_users_id'
    `);
    if (!fkRows.length) {
      await queryInterface.addConstraint('Users', {
        fields: ['brokerId'],
        type: 'foreign key',
        name: 'fk_users_brokerId_users_id',
        references: { table: 'Users', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // 3) Add unique index on phone only if not exists
    const [idxRows] = await queryInterface.sequelize.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'Users' AND indexname = 'users_phone_unique'
    `);
    if (!idxRows.length) {
      await queryInterface.addIndex('Users', ['phone'], {
        unique: true,
        name: 'users_phone_unique'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Down is best-effort; remove index/constraint/columns if present
    try {
      await queryInterface.removeIndex('Users', 'users_phone_unique');
    } catch (_) {}

    try {
      await queryInterface.removeConstraint('Users', 'fk_users_brokerId_users_id');
    } catch (_) {}

    const table = await queryInterface.describeTable('Users');

    if (table.brokerId) {
      await queryInterface.removeColumn('Users', 'brokerId');
    }
    if (table.isPhoneVerified) {
      await queryInterface.removeColumn('Users', 'isPhoneVerified');
    }
    if (table.otpExpires) {
      await queryInterface.removeColumn('Users', 'otpExpires');
    }
    if (table.otpCode) {
      await queryInterface.removeColumn('Users', 'otpCode');
    }
  }
};