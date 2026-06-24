const nodemailer = require("nodemailer");

/**
 * Build a verified transporter using Gmail SMTP directly (not the 'gmail' shortcut).
 * This avoids Gmail silently dropping emails to external recipients.
 */
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        pool: false,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });

    return transporter;
};

/**
 * Send a 6-digit OTP verification email.
 * @param {string} toEmail  - recipient
 * @param {string} otp      - 6-digit code
 * @param {string} name     - student's name
 */
const sendVerificationEmail = async(toEmail, otp, name) => {
    const transporter = createTransporter();

    // Verify connection before sending (throws early if credentials are wrong)
    await transporter.verify();

    const mailOptions = {
        from: `"GradeOS 🎓" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Verify Your GradeOS Account",
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #0f172a; margin: 0; padding: 20px; }
          .card {
            max-width: 480px; margin: 0 auto;
            background: #1e293b; border-radius: 16px;
            border: 1px solid #334155; overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            padding: 32px 24px; text-align: center;
          }
          .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
          .header p  { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 32px 24px; }
          .greeting { color: #94a3b8; font-size: 15px; margin: 0 0 20px; }
          .greeting span { color: #e2e8f0; font-weight: 600; }
          .otp-box {
            background: #0f172a; border: 2px dashed #6366f1;
            border-radius: 12px; padding: 24px;
            text-align: center; margin: 24px 0;
          }
          .otp-label { color: #64748b; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px; }
          .otp-code  { color: #6366f1; font-size: 40px; font-weight: 800; letter-spacing: 8px; margin: 0; }
          .expires   { color: #64748b; font-size: 13px; margin: 16px 0 0; }
          .expires span { color: #f59e0b; font-weight: 600; }
          .footer { color: #475569; font-size: 12px; text-align: center; padding: 16px 24px 24px; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>🎓 GradeOS</h1>
            <p>Student Grades Management System</p>
          </div>
          <div class="body">
            <p class="greeting">Hello, <span>${name}</span>!</p>
            <p style="color:#94a3b8;font-size:14px;margin:0">
              Use the code below to verify your email address and activate your account.
            </p>
            <div class="otp-box">
              <p class="otp-label">Verification Code</p>
              <p class="otp-code">${otp}</p>
              <p class="expires">Expires in <span>15 minutes</span></p>
            </div>
            <p style="color:#64748b;font-size:13px;margin:0">
              If you didn't create a GradeOS account, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} GradeOS · Assiut University
          </div>
        </div>
      </body>
      </html>
    `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${toEmail} — Message ID: ${info.messageId}`);
    return info;
};

module.exports = { sendVerificationEmail };