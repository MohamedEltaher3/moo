const jwt     = require("jsonwebtoken");
const Student = require("../models/Student");

// Helper: sign JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

// Helper: safe user object (no password)
const safeUser = (student) => ({
  _id:        student._id,
  name:       student.name,
  email:      student.email,
  role:       student.role,
  department: student.department,
  age:        student.age,
  phone:      student.phone,
});

// POST /api/auth/register  — always creates role: "student"
const register = async (req, res) => {
  try {
    const { name, email, password, age, department, phone } = req.body;

    const existing = await Student.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    // Force role to "student" — admin is seeded only
    const student = await Student.create({
      name,
      email,
      password,
      age,
      department,
      phone,
      role: "student",
    });

    const token = signToken(student._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      data: safeUser(student),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide email and password" });
    }

    const student = await Student.findOne({ email }).select("+password");

    if (!student || !(await student.matchPassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = signToken(student._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: safeUser(student),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

module.exports = { register, login, getMe };
