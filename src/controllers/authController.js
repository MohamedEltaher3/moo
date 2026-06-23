const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Student = require("../models/Student");

// ─── Email transporter ───────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || "7d",
    });

const safeUser = (student) => ({
    _id: student._id,
    name: student.name,
    email: student.email,
    role: student.role,
    department: student.department,
    age: student.age,
    phone: student.phone,
    isVerified: student.isVerified,
});

// Generate 6-digit code
const generateCode = () =>
    crypto.randomInt(100000, 999999).toString();

// Send verification email
const sendVerificationEmail = async(email, name, code) => {
    await transporter.sendMail({
        from: `"GradeOS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "GradeOS — Verify Your Email",
        html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#2d6a4f;">Welcome to GradeOS, ${name}!</h2>
        <p>Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f0f7f4;border-radius:6px;color:#1b4332;">
          ${code}
        </div>
        <p style="margin-top:24px;color:#666;font-size:13px;">If you didn't create this account, ignore this email.</p>
      </div>
    `,
    });
};

// ─── Controllers ─────────────────────────────────────────────────────────────

// POST /api/auth/register
const register = async(req, res) => {
    try {
        const { name, email, password, age, department, phone } = req.body;

        const existing = await Student.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const code = generateCode();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const student = await Student.create({
            name,
            email,
            password,
            age,
            department,
            phone,
            role: "student",
            isVerified: false,
            verificationCode: code,
            verificationCodeExpires: expires,
        });

        await sendVerificationEmail(email, name, code);

        res.status(201).json({
            success: true,
            message: "Account created. A 6-digit verification code was sent to your email.",
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error.message);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/verify-email
const verifyEmail = async(req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: "Email and code are required" });
        }

        const student = await Student
            .findOne({ email })
            .select("+verificationCode +verificationCodeExpires");

        if (!student) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        if (student.isVerified) {
            return res.status(400).json({ success: false, message: "Email already verified" });
        }

        if (!student.verificationCode || student.verificationCode !== code) {
            return res.status(400).json({ success: false, message: "Invalid verification code" });
        }

        if (student.verificationCodeExpires < new Date()) {
            return res.status(400).json({ success: false, message: "Verification code has expired. Please register again." });
        }

        // Mark as verified and clear code
        student.isVerified = true;
        student.verificationCode = undefined;
        student.verificationCodeExpires = undefined;
        await student.save();

        const token = signToken(student._id);

        res.status(200).json({
            success: true,
            message: "Email verified successfully. You are now logged in.",
            token,
            data: safeUser(student),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/login
const login = async(req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please provide email and password" });
        }

        const student = await Student.findOne({ email }).select("+password");

        if (!student || !(await student.matchPassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Block unverified accounts (admin is always verified)
        if (!student.isVerified && student.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in",
            });
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
const getMe = async(req, res) => {
    res.status(200).json({ success: true, data: req.user });
};

module.exports = { register, verifyEmail, login, getMe };