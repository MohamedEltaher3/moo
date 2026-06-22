const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validate      = require("../middleware/validate");
const { protect, restrictTo } = require("../middleware/auth");
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

const studentValidation = [
  body("name")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("age")
    .notEmpty().withMessage("Age is required")
    .isInt({ min: 16, max: 60 }).withMessage("Age must be between 16 and 60"),
  body("department")
    .notEmpty().withMessage("Department is required")
    .isIn(["CS", "IT", "Engineering", "Business", "Science"])
    .withMessage("Department must be one of: CS, IT, Engineering, Business, Science"),
  body("phone")
    .optional()
    .isMobilePhone().withMessage("Please enter a valid phone number"),
];

const idValidation = [
  param("id").isMongoId().withMessage("Invalid student ID"),
];

// All routes require authentication
router.use(protect);

// GET /api/students
//   Admin  → all students with filters
//   Student → returns only their own record
router.get("/", getAllStudents);

// GET /api/students/:id
//   Admin  → any student
//   Student → only themselves (enforced in controller)
router.get("/:id", idValidation, validate, getStudentById);

// POST /api/students — admin only
router.post("/", restrictTo("admin"), studentValidation, validate, createStudent);

// PUT /api/students/:id
//   Admin  → any student
//   Student → only themselves (enforced in controller)
router.put("/:id", idValidation, validate, updateStudent);

// DELETE /api/students/:id — admin only
router.delete("/:id", restrictTo("admin"), idValidation, validate, deleteStudent);

module.exports = router;
