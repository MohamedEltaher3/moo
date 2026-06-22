const Grade = require("../models/Grade");
const Student = require("../models/Student");
const Course = require("../models/Course");

// GET /api/grades
// Admin → all grades with filters | Student → only their own grades
const getAllGrades = async (req, res) => {
  try {
    const { student, course, semester, year, minGrade, maxGrade } = req.query;
    const filter = {};

    // Student can only see their own grades — override any ?student= param
    if (req.user.role !== "admin") {
      filter.student = req.user._id;
    } else {
      if (student) filter.student = student;
    }

    if (course)   filter.course   = course;
    if (semester) filter.semester = Number(semester);
    if (year)     filter.year     = Number(year);
    if (minGrade || maxGrade) {
      filter.grade = {};
      if (minGrade) filter.grade.$gte = Number(minGrade);
      if (maxGrade) filter.grade.$lte = Number(maxGrade);
    }

    const grades = await Grade.find(filter)
      .populate("student", "name email department")
      .populate("course",  "name code credits")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: grades.length, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/grades/:id
// Admin → any | Student → only their own
const getGradeById = async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id)
      .populate("student", "name email department")
      .populate("course",  "name code credits");

    if (!grade) {
      return res.status(404).json({ success: false, message: "Grade not found" });
    }

    // Student can only access their own grade
    if (
      req.user.role !== "admin" &&
      grade.student._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied — you can only view your own grades",
      });
    }

    res.status(200).json({ success: true, data: grade });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/grades — admin only (enforced in route)
const createGrade = async (req, res) => {
  try {
    const { student, course } = req.body;

    const studentExists = await Student.findById(student);
    if (!studentExists) {
      return res.status(400).json({ success: false, message: "Student not found" });
    }

    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(400).json({ success: false, message: "Course not found" });
    }

    const grade = await Grade.create(req.body);
    const populated = await grade.populate([
      { path: "student", select: "name email department" },
      { path: "course",  select: "name code credits" },
    ]);

    res.status(201).json({
      success: true,
      message: "Grade created successfully",
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Grade already exists for this student, course, semester and year",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/grades/:id — admin only (enforced in route)
const updateGrade = async (req, res) => {
  try {
    const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("student", "name email department")
      .populate("course",  "name code credits");

    if (!grade) {
      return res.status(404).json({ success: false, message: "Grade not found" });
    }
    res.status(200).json({ success: true, message: "Grade updated successfully", data: grade });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/grades/:id — admin only (enforced in route)
const deleteGrade = async (req, res) => {
  try {
    const grade = await Grade.findByIdAndDelete(req.params.id);
    if (!grade) {
      return res.status(404).json({ success: false, message: "Grade not found" });
    }
    res.status(200).json({ success: true, message: "Grade deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/grades/student/:studentId/summary
// Admin → any student | Student → only themselves
const getStudentSummary = async (req, res) => {
  try {
    // Student can only see their own summary
    if (
      req.user.role !== "admin" &&
      req.user._id.toString() !== req.params.studentId
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied — you can only view your own summary",
      });
    }

    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const grades = await Grade.find({ student: req.params.studentId })
      .populate("course", "name code credits");

    if (grades.length === 0) {
      return res.status(200).json({
        success: true,
        data: { student, grades: [], average: 0, totalCourses: 0 },
      });
    }

    const totalGrade = grades.reduce((sum, g) => sum + g.grade, 0);
    const average    = (totalGrade / grades.length).toFixed(2);

    res.status(200).json({
      success: true,
      data: { student, grades, average: Number(average), totalCourses: grades.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllGrades, getGradeById, createGrade, updateGrade, deleteGrade, getStudentSummary };
