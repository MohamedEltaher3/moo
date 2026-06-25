const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const PendingStudent = require("../models/PendingStudent");
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

const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /api/auth/register ────────────────────────────────────────────────
const register = async(req, res) => {
    try {
        const { name, email, password, age, department, phone } = req.body;

        // Check real students
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const otp = generateOTP();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        // Send email FIRST — if it fails, don't save anything
        try {
            await sendVerificationEmail(email, otp, name);
        } catch (mailErr) {
            console.error("Mail error:", mailErr.message);
            return res.status(500).json({
                success: false,
                message: "Failed to send verification email. Check EMAIL_USER / EMAIL_PASS in .env",
            });
        }

        // Save to pending collection (upsert in case they try again)
        await PendingStudent.findOneAndUpdate({ email }, { name, email, password, age, department, phone, otp, otpExpires: expires }, { upsert: true, new: true });

        res.status(201).json({
            success: true,
            message: "Check your email for the 6-digit verification code.",
            data: { email },
        });
    } catch (error) {
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

        const pending = await PendingStudent.findOne({ email });

        if (!pending) {
            return res.status(404).json({ success: false, message: "No pending registration found. Please register again." });
        }

        if (pending.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        if (pending.otpExpires < new Date()) {
            await PendingStudent.findOneAndDelete({ email });
            return res.status(400).json({ success: false, message: "OTP has expired — please register again" });
        }

        // Create the real student account
        const student = await Student.create({
            name: pending.name,
            email: pending.email,
            password: pending.password,
            age: pending.age,
            department: pending.department,
            phone: pending.phone,
            role: "student",
            isEmailVerified: true,
        });

        // Delete pending record
        await PendingStudent.findOneAndDelete({ email });

        const token = signToken(student._id);

        res.status(200).json({
            success: true,
            message: "Email verified! You are now logged in.",
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
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });

        const pending = await PendingStudent.findOne({ email });
        if (!pending) {
            return res.status(404).json({ success: false, message: "No pending registration found. Please register again." });
        }

        const otp = generateOTP();
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        pending.otp = otp;
        pending.otpExpires = expires;
        await pending.save();

        await sendVerificationEmail(email, otp, pending.name);

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