const { Sequelize } = require("sequelize");
const models = require("../models");

require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
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
});
module.exports = { sequelize };
