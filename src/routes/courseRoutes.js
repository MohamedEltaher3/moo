const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");

const courseValidation = [
  body("name")
    .notEmpty()
    .withMessage("Course name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Course name must be between 2 and 100 characters"),
  body("code")
    .notEmpty()
    .withMessage("Course code is required")
    .isLength({ min: 2, max: 10 })
    .withMessage("Course code must be between 2 and 10 characters"),
  body("department")
    .notEmpty()
    .withMessage("Department is required")
    .isIn(["CS", "IT", "Engineering", "Business", "Science"])
    .withMessage("Department must be one of: CS, IT, Engineering, Business, Science"),
  body("credits")
    .notEmpty()
    .withMessage("Credits are required")
    .isInt({ min: 1, max: 6 })
    .withMessage("Credits must be between 1 and 6"),
  body("description").optional().isString().withMessage("Description must be a string"),
];

const idValidation = [
  param("id").isMongoId().withMessage("Invalid course ID"),
];

router.get("/", getAllCourses);
router.get("/:id", idValidation, validate, getCourseById);
router.post("/", courseValidation, validate, createCourse);
router.put("/:id", idValidation, validate, updateCourse);
router.delete("/:id", idValidation, validate, deleteCourse);

module.exports = router;
