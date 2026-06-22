// ⚠️ dotenv MUST be first — before any other require that reads process.env
require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

const authRoutes    = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes  = require("./routes/courseRoutes");
const gradeRoutes   = require("./routes/gradeRoutes");
const { protect }   = require("./middleware/auth");

const app = express();

connectDB();

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public
app.use("/api/auth", authRoutes);

// Protected (role checks handled per-route or in controllers)
app.use("/api/students", protect, studentRoutes);
app.use("/api/courses",  protect, courseRoutes);
app.use("/api/grades",   protect, gradeRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "🎓 Student Grades API is running",
    version: "3.0.0",
    endpoints: {
      auth:     "/api/auth (POST /register, POST /login, GET /me)",
      students: "/api/students [protected — role-based]",
      courses:  "/api/courses  [protected — admin write]",
      grades:   "/api/grades   [protected — admin write]",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
