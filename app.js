const rateLimit = require("express-rate-limit");
const { Transaction, QueryTypes } = require("sequelize");
const express = require("express");
const cluster = require("cluster");
const os = require("os");
const { exec } = require("child_process");
const { sequelize } = require("./db");
const {User} = require("./models");

const numCPUs = os.cpus().length; // Get number of CPU cores

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);

  // Fork worker processes for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart worker if it crashes
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
      // Start a transaction
      const t = await sequelize.transaction(async (transaction) => {
        // Lock the user record for update, so no other transaction can modify it
        const user = await User.findByPk(userId, {
          lock: transaction.LOCK.UPDATE,  // Lock the row for update
          transaction: transaction,       // Associate the transaction with this query
        });
    
        // Check if the user exists
        if (!user) {
          throw new Error("User not found");
        }
    
        // Check if the balance will go below 0 after updating
        if (user.balance + amount < 0) {
          throw new Error("Insufficient funds");
        }
    
        // Increment or update the balance safely inside the transaction
        user.balance += amount;
    
        // Save the updated user object with the transaction
        await user.save({ transaction: transaction });
    
        // Return the updated balance
        return user.balance;
      });
    
      // If everything goes fine, send the success response
      res.json({ success: true, balance: t });
    } catch (err) {
      // Handle errors, including transaction rollbacks
      console.error("Error:", err);
      res.status(400).json({ error: err.message });
    }
    
  });
  

  async function runMigrationsAndSeeders() {
    console.log("🔄 Running Migrations...");
    try {
      // Ensure DB connection and sync
      await sequelize.authenticate();
      await sequelize.sync(); // Ensure the DB schema is up-to-date
      console.log("✅ Migrations completed!");

      // Now, run seeds if necessary
      await runSeeds();

      console.log("✅ Seeders completed!");
    } catch (error) {
      console.error("❌ Error during migration/seed:", error);
      throw new Error("Migration or Seeder process failed");
    }
  }

  function runSeeds() {
    return new Promise((resolve, reject) => {
      // Run sequelize seeders
      exec(
        "npx sequelize-cli db:seed:undo:all && npx sequelize-cli db:seed:all", // Run all seeds
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
      await runMigrationsAndSeeders(); // Run migrations and seeders
      const server = app.listen(4000, () => {
        console.log(`🚀 Server running at http://localhost:4000`);
      });
      server.keepAliveTimeout = 60000;
    } catch (err) {
      console.error("❌ Failed to initialize server:", err);
      process.exit(1); // Exit if migration or seeding failed
    }
  }

  startServer();
}

process.on("SIGINT", async () => {
  console.log("Gracefully shutting down...");

  // Close the main Sequelize connection
  await sequelize.close();

  // Kill all workers in the cluster
  if (cluster.isMaster) {
    Object.values(cluster.workers).forEach(worker => {
      worker.kill();
    });
  }

  process.exit(0); // Exit the process
});

process.on("SIGTERM", async () => {
  console.log("Gracefully shutting down...");

  await sequelize.close();

  if (cluster.isMaster) {
    Object.values(cluster.workers).forEach(worker => {
      worker.kill();
    });
  }

  process.exit(0);
});