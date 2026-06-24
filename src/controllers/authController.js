const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Student = require("../models/Student");
const { sendVerificationEmail } = require("../utils/emailService");

// ── Helpers ────────────────────────────────────────────────────────────────

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
    isEmailVerified: student.isEmailVerified,
});

/** Generate a 6-digit numeric OTP */
const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /api/auth/register ────────────────────────────────────────────────
const register = async(req, res) => {
    try {
        const { name, email, password, age, department, phone } = req.body;

        const existing = await Student.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const otp = generateOTP();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        const student = await Student.create({
            name,
            email,
            password,
            age,
            department,
            phone,
            role: "student",
            isEmailVerified: false,
            emailVerifyOTP: otp,
            emailVerifyOTPExpires: expires,
        });

        // Send OTP email — if it fails, delete the account and return an error
        try {
            await sendVerificationEmail(email, otp, name);
        } catch (mailErr) {
            await Student.findByIdAndDelete(student._id);
            console.error("Mail error:", mailErr.message);
            return res.status(500).json({
                success: false,
                message: "Failed to send verification email. Check EMAIL_USER / EMAIL_PASS in .env",
            });
        }

        res.status(201).json({
            success: true,
            message: "Account created! Check your email for the 6-digit verification code.",
            data: { email: student.email },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/auth/verify-email ────────────────────────────────────────────
const verifyEmail = async(req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required" });
        }

        // Fetch OTP fields explicitly (they're select:false)
        const student = await Student.findOne({ email })
            .select("+emailVerifyOTP +emailVerifyOTPExpires");

        if (!student) {
            return res.status(404).json({ success: false, message: "No account found with this email" });
        }

        if (student.isEmailVerified) {
            return res.status(400).json({ success: false, message: "Email is already verified" });
        }

        if (!student.emailVerifyOTP || student.emailVerifyOTP !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        if (student.emailVerifyOTPExpires < new Date()) {
            return res.status(400).json({ success: false, message: "OTP has expired — please request a new one" });
        }

        // Mark verified & clear OTP
        student.isEmailVerified = true;
        student.emailVerifyOTP = undefined;
        student.emailVerifyOTPExpires = undefined;
        await student.save();

        const token = signToken(student._id);

        res.status(200).json({
            success: true,
            message: "Email verified successfully! You are now logged in.",
            token,
            data: safeUser(student),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/auth/resend-otp ──────────────────────────────────────────────
const resendOTP = async(req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const student = await Student.findOne({ email })
            .select("+emailVerifyOTP +emailVerifyOTPExpires");

        if (!student) {
            return res.status(404).json({ success: false, message: "No account found with this email" });
        }

        if (student.isEmailVerified) {
            return res.status(400).json({ success: false, message: "Email is already verified" });
        }

        const otp = generateOTP();
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        student.emailVerifyOTP = otp;
        student.emailVerifyOTPExpires = expires;
        await student.save();

        await sendVerificationEmail(email, otp, student.name);

        res.status(200).json({ success: true, message: "New OTP sent to your email" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/auth/login ───────────────────────────────────────────────────
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

        // Block unverified accounts (admin bypasses this check)
        if (!student.isEmailVerified && student.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Email not verified. Please check your inbox for the verification code.",
                needsVerification: true,
                email: student.email,
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

// ── GET /api/auth/me (protected) ───────────────────────────────────────────
const getMe = async(req, res) => {
    res.status(200).json({ success: true, data: req.user });
};

module.exports = { register, verifyEmail, resendOTP, login, getMe };