require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false
  },
  test: {
    username: "postgres",
    password: null,
    database: "trucking_test",
    host: "127.0.0.1",
    dialect: "postgres",
    logging: false
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    dialectOptions: { 
      ssl: { 
        require: true, 
        rejectUnauthorized: false 
      } 
    },
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
