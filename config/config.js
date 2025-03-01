require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
    pool: {
      max: 500,       // Max number of connections in the pool
      min: 0,        // Min number of connections in the pool
      idle: 10000,   // How long a connection can be idle before being released
      acquire: 30000 // Timeout in ms for acquiring a new connection
    },
    dialectOptions: {
      connectTimeout: 60000, // Connection timeout (in ms)
    },
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
   
  },
  production: {
    username: "root",
    password: null,
    database: "database_production",
    host: "127.0.0.1",
    dialect: "mysql",
  },
};
