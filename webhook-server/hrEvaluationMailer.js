const nodemailer = require('nodemailer');
const fs = require('fs');

const HR_EMAIL = process.env.HR_EMAIL;
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASS
  }
});

module.exports = async function hrEvaluationMailer({ candidateName, repoUrl, commitCount, evaluation }) {
  try {
    const mailOptions = {
      from: SMTP_EMAIL,
      to: HR_EMAIL,
      subject: 'Candidate Technical Task Submission Completed',
      text: `Candidate Name: ${candidateName}

Repository URL: ${repoUrl}
Commit Count: ${commitCount}
Final AI Score: ${evaluation.finalScore}/100
AI Remark: ${evaluation.aiRemark}

Regards,
SensusSoft AI Hiring System`
    };

    if (evaluation.pdfPath && fs.existsSync(evaluation.pdfPath)) {
      mailOptions.attachments = [
        {
          filename: 'candidate-submission-evaluation.pdf',
          path: evaluation.pdfPath
        }
      ];
    }

    await transporter.sendMail(mailOptions);

    if (evaluation.pdfPath && fs.existsSync(evaluation.pdfPath)) {
      setTimeout(() => {
        try { fs.unlinkSync(evaluation.pdfPath); } catch (e) {}
      }, 5000);
    }

    console.log(`[Mailer] HR email sent for ${candidateName}`);
  } catch (err) {
    console.log('[Mailer Error]', err.message);
  }
};