const Student = require("../models/Student");

// GET /api/students
// Admin → all students | Student → only themselves
const getAllStudents = async (req, res) => {
  try {
    // Non-admin students can only see themselves
    if (req.user.role !== "admin") {
      const student = await Student.findById(req.user._id).select("-password");
      return res.status(200).json({
        success: true,
        count: 1,
        data: [student],
      });
    }

    const { department, name } = req.query;
    const filter = {};
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
// Admin → any student | Student → only themselves
const getStudentById = async (req, res) => {
  try {
    // Students can only access their own profile
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

// POST /api/students  — admin only (enforced in route)
const createStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    const result  = student.toObject();
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
// Admin → any | Student → only themselves (no role change)
const updateStudent = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied — you can only edit your own profile",
      });
    }

    // Strip sensitive fields — password & role not editable via this route
    const { password, role, ...updateData } = req.body;
    // Admin can change role explicitly if passed separately (optional extension)

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

// DELETE /api/students/:id — admin only (enforced in route)
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.status(200).json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, deleteStudent };
