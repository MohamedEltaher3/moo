const express = require("express");
const router  = express.Router();
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, restrictTo } = require("../middleware/auth");
const {
  getAllGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
  getStudentSummary,
} = require("../controllers/gradeController");

const gradeValidation = [
  body("student").notEmpty().withMessage("Student ID is required").isMongoId().withMessage("Invalid student ID"),
  body("course").notEmpty().withMessage("Course ID is required").isMongoId().withMessage("Invalid course ID"),
  body("grade").notEmpty().withMessage("Grade is required").isFloat({ min: 0, max: 100 }).withMessage("Grade must be between 0 and 100"),
  body("semester").notEmpty().withMessage("Semester is required").isIn([1, 2]).withMessage("Semester must be 1 or 2"),
  body("year").notEmpty().withMessage("Year is required").isInt({ min: 2000, max: 2100 }).withMessage("Year must be between 2000 and 2100"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

const idValidation = [param("id").isMongoId().withMessage("Invalid grade ID")];

// GET — student sees only their own (filtered in controller)
router.get("/",                          getAllGrades);
router.get("/student/:studentId/summary", getStudentSummary);
router.get("/:id", idValidation, validate, getGradeById);

// Write operations — admin only
router.post("/",   restrictTo("admin"), gradeValidation, validate, createGrade);
router.put("/:id", restrictTo("admin"), idValidation,    validate, updateGrade);
router.delete("/:id", restrictTo("admin"), idValidation, validate, deleteGrade);

module.exports = router;
