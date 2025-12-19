/**
 * Quick script to verify an email locally (no SMTP needed)
 * Usage: node scripts/verify-email-local.js <email>
 */

require('dotenv').config();
const { sequelize, User } = require('../models');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('❌ Please provide an email address');
    console.error('Usage: node scripts/verify-email-local.js <email>');
    process.exit(1);
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    if (user.isEmailVerified) {
      console.log(`✅ Already verified: ${email}`);
      process.exit(0);
    }

    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    console.log(`✅ Marked as verified: ${email} (id=${user.id})`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();

