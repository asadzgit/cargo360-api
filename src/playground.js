const { Sequelize, DataTypes } = require('sequelize');

// Connect to RDS
const sequelize = new Sequelize('postgres', 'cargo_admin', 'tXW,z14~umN5', {
  host: 'cargodb.chgk6om02qvg.eu-north-1.rds.amazonaws.com',
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,          // force SSL
      rejectUnauthorized: false, // skip cert verification (for dev/test)
    }
  },
  port: 5432,
  logging: console.log, // see SQL queries (optional)
});

// Define model
const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected');

    await sequelize.sync(); // ensures table exists

    // Insert
    await User.create({ name: 'Asad', email: 'asad@example.com' });

    // Query
    const users = await User.findAll();
    console.log('Users:', users.map(u => u.toJSON()));

    process.exit(0); // exit cleanly
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
