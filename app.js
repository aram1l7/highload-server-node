const rateLimit = require("express-rate-limit");
const { Transaction, QueryTypes } = require("sequelize");
const express = require("express");
const cluster = require("cluster");
const os = require("os");
const { exec } = require("child_process");
const { sequelize } = require("./db");
const { User } = require("./models");

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();
  app.use(express.json());

  app.post("/update-balance", async (req, res) => {
    const { userId, amount } = req.body;

    try {
      const t = await sequelize.transaction(async (transaction) => {
        const user = await User.findByPk(userId, {
          lock: transaction.LOCK.UPDATE, // Lock the row for update
          transaction: transaction, // Associate the transaction with this query
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (user.balance + amount < 0) {
          throw new Error("Insufficient funds");
        }

        user.balance += amount;

        await user.save({ transaction: transaction });

        return user.balance;
      });

      res.json({ success: true, balance: t });
    } catch (err) {
      console.error("Error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  async function runMigrationsAndSeeders() {
    console.log("🔄 Running Migrations...");

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations_lock (
        id SERIAL PRIMARY KEY,
        locked BOOLEAN DEFAULT false
      );
    `);

    const [result] = await sequelize.query(
      "SELECT * FROM migrations_lock LIMIT 1"
    );

    if (result.length > 0 && result[0].locked) {
      console.log("Migrations and seeders have already been run.");
      return;
    }

    try {
      await sequelize.query(
        "INSERT INTO migrations_lock (locked) VALUES (true) ON CONFLICT (id) DO UPDATE SET locked = true;"
      );

      await sequelize.authenticate();
      await sequelize.sync();
      console.log("✅ Migrations completed!");

      await runSeeds();

      console.log("✅ Seeders completed!");
    } catch (error) {
      console.error("❌ Error during migration/seed:", error);
      throw new Error("Migration or Seeder process failed");
    }
  }

  function runSeeds() {
    return new Promise((resolve, reject) => {
      exec(
        "npx sequelize-cli db:seed:undo:all && npx sequelize-cli db:seed:all",
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Ошибка при запуске сидеров: ${error.message}`);
            reject(error);
          }
          if (stderr) {
            console.error(`stderr: ${stderr}`);
            reject(stderr);
          }
          console.log(`stdout: ${stdout}`);
          resolve();
        }
      );
    });
  }

  async function startServer() {
    try {
      await runMigrationsAndSeeders();
      const server = app.listen(4000, () => {
        console.log(`🚀 Server running at http://localhost:4000`);
      });
      server.keepAliveTimeout = 60000;
    } catch (err) {
      console.error("❌ Failed to initialize server:", err);
      process.exit(1);
    }
  }

  startServer();
}

process.on("SIGINT", async () => {
  console.log("Gracefully shutting down...");

  await sequelize.close();

  if (cluster.isMaster) {
    Object.values(cluster.workers).forEach((worker) => {
      worker.kill();
    });
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Gracefully shutting down...");

  await sequelize.close();

  if (cluster.isMaster) {
    Object.values(cluster.workers).forEach((worker) => {
      worker.kill();
    });
  }

  process.exit(0);
});
