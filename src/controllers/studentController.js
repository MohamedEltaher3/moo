const Student = require("../models/Student");

// GET /api/students
// Admin → all students | Student → only themselves
const getAllStudents = async(req, res) => {
    try {
        if (req.user.role !== "admin") {
            const student = await Student.findById(req.user._id).select("-password");
            return res.status(200).json({ success: true, count: 1, data: [student] });
        }

        const { department, name } = req.query;
        const filter = { isEmailVerified: true };
        if (department) filter.department = department;
        if (name) filter.name = { $regex: name, $options: "i" };

        const students = await Student.find(filter)
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: students.length, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/students/:id
const getStudentById = async(req, res) => {
    try {
        if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied — you can only view your own profile",
            });
        }

        const student = await Student.findById(req.params.id).select("-password");
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }
        res.status(200).json({ success: true, data: student });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/students — admin only
const createStudent = async(req, res) => {
    try {
        const student = await Student.create(req.body);
        const result = student.toObject();
        delete result.password;

        res.status(201).json({
            success: true,
            message: "Student created successfully",
            data: result,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/students/:id
const updateStudent = async(req, res) => {
    try {
        const isAdmin = req.user.role === "admin";

        if (!isAdmin && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied — you can only edit your own profile",
            });
        }

        const { password, role, ...updateData } = req.body;

        const student = await Student.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).select("-password");

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }
        res.status(200).json({ success: true, message: "Student updated successfully", data: student });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/students/:id — admin only
const deleteStudent = async(req, res) => {
    try {
        // ── 🛡️ Protect admin accounts from deletion ──────────────────────────
        const target = await Student.findById(req.params.id);

        if (!target) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        if (target.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin accounts cannot be deleted",
            });
        }
        // ─────────────────────────────────────────────────────────────────────

        await Student.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Student deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent };