const mongoose = require("mongoose");

const pendingStudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number, required: true },
    department: { type: String, required: true },
    phone: { type: String },
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true },
}, { timestamps: true });

// Auto-delete after 15 minutes
pendingStudentSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingStudent", pendingStudentSchema);