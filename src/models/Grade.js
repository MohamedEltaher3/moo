const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    grade: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    semester: {
      type: Number,
      required: true,
      enum: [1, 2],
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate grade for same student + course + semester + year
gradeSchema.index(
  { student: 1, course: 1, semester: 1, year: 1 },
  { unique: true }
);

// Virtual for letter grade
gradeSchema.virtual("letterGrade").get(function () {
  if (this.grade >= 90) return "A";
  if (this.grade >= 80) return "B";
  if (this.grade >= 70) return "C";
  if (this.grade >= 60) return "D";
  return "F";
});

gradeSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Grade", gradeSchema);
