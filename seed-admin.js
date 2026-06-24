/**
 * seed-admin.js
 * Run once to create the admin account:
 *   node seed-admin.js
 *
 * Set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in .env or pass as env vars:
 *   ADMIN_EMAIL=admin@gradeos.com ADMIN_PASSWORD=Admin@123 node seed-admin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Student  = require("./src/models/Student");

const ADMIN = {
  name:       process.env.ADMIN_NAME       || "Admin",
  email:      process.env.ADMIN_EMAIL      || "admin@gradeos.com",
  password:   process.env.ADMIN_PASSWORD   || "Admin@123",
  age:        30,
  department: "CS",
  role:       "admin",
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const existing = await Student.findOne({ email: ADMIN.email });

    if (existing) {
      if (existing.role === "admin") {
        console.log(`ℹ️  Admin already exists: ${ADMIN.email}`);
      } else {
        // Upgrade existing account to admin
        existing.role = "admin";
        await existing.save();
        console.log(`⬆️  Upgraded existing account to admin: ${ADMIN.email}`);
      }
    } else {
      await Student.create(ADMIN);
      console.log(`🎉 Admin created: ${ADMIN.email} / ${ADMIN.password}`);
      console.log("⚠️  Change the password after first login!");
    }
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
}

seed();
