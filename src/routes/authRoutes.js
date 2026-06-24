const express  = require("express");
const router   = express.Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const { register, verifyEmail, resendOTP, login, getMe } = require("../controllers/authController");

// ── Validation rules ──────────────────────────────────────────────────────

const registerValidation = [
  body("name")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters"),
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

const loginValidation = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const verifyValidation = [
  body("email").notEmpty().withMessage("Email is required").isEmail(),
  body("otp").notEmpty().withMessage("OTP is required").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
];

// ── Routes ────────────────────────────────────────────────────────────────

router.post("/register",     registerValidation, validate, register);
router.post("/verify-email", verifyValidation,   validate, verifyEmail);
router.post("/resend-otp",   body("email").isEmail(), validate, resendOTP);
router.post("/login",        loginValidation,    validate, login);
router.get( "/me",           protect,            getMe);

module.exports = router;
