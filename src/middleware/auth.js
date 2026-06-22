const jwt     = require("jsonwebtoken");
const Student = require("../models/Student");

// ── protect: verify JWT and attach req.user ──────────────
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized — no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await Student.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Token is valid but user no longer exists",
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ── restrictTo: role-based access guard ─────────────────
// Usage: restrictTo("admin")  or  restrictTo("admin", "student")
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied — requires role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
