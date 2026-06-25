const https = require("https");

const sendVerificationEmail = async(toEmail, otp, name) => {
    const payload = JSON.stringify({
        sender: { name: "GradeOS", email: "afc298001@smtp-brevo.com" },
        to: [{ email: toEmail, name: name }],
        subject: "Verify Your GradeOS Account",
        htmlContent: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:'Segoe UI',sans-serif;background:#0f172a;margin:0;padding:20px;">
        <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">🎓 GradeOS</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Student Grades Management System</p>
          </div>
          <div style="padding:32px 24px;">
            <p style="color:#94a3b8;font-size:15px;margin:0 0 20px;">Hello, <span style="color:#e2e8f0;font-weight:600;">${name}</span>!</p>
            <p style="color:#94a3b8;font-size:14px;margin:0;">Use the code below to verify your email address.</p>
            <div style="background:#0f172a;border:2px dashed #6366f1;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
              <p style="color:#64748b;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Verification Code</p>
              <p style="color:#6366f1;font-size:40px;font-weight:800;letter-spacing:8px;margin:0;">${otp}</p>
              <p style="color:#64748b;font-size:13px;margin:16px 0 0;">Expires in <span style="color:#f59e0b;font-weight:600;">15 minutes</span></p>
            </div>
            <p style="color:#64748b;font-size:13px;margin:0;">If you didn't create a GradeOS account, you can safely ignore this email.</p>
          </div>
          <div style="color:#475569;font-size:12px;text-align:center;padding:16px 24px 24px;border-top:1px solid #334155;">
            &copy; ${new Date().getFullYear()} GradeOS · Assiut University
          </div>
        </div>
      </body>
      </html>
    `,
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
                hostname: "api.brevo.com",
                path: "/v3/smtp/email",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Length": Buffer.byteLength(payload),
                },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`✅ Email sent to ${toEmail}`);
                        resolve(data);
                    } else {
                        reject(new Error(`Brevo API error: ${res.statusCode} — ${data}`));
                    }
                });
            }
        );
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
};

module.exports = { sendVerificationEmail };