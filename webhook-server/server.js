require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');

const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
async function generateAssignmentPDF(candidate) {
  const pdfPath = path.join(__dirname, `assignment-${candidate.id}.pdf`);

  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = require('fs').createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(22).text('SensusSoft Technical Assignment', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
    doc.text(`Applied Role: ${candidate.appliedRole}`);
    doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
    doc.text(`Submission Deadline: Within 3 Days`);
    doc.moveDown();

    doc.fontSize(16).text(`Assignment: ${candidate.assignment.title}`);
    doc.moveDown();

    doc.fontSize(12).text('Task Requirements:');
    candidate.assignment.requirements.forEach((req, i) => {
      doc.text(`${i + 1}. ${req}`);
    });

    doc.moveDown();
    doc.text(`Private GitHub Repository: ${candidate.githubRepoUrl}`);
    doc.moveDown();
    doc.text('Please complete the above assignment and push all code changes to the provided private GitHub repository.');
    doc.text('Our HR and technical team will review your commits and final implementation.');

    doc.end();

    stream.on('finish', () => resolve(pdfPath));
  });
}
const { createRepo } = require('../github-demo/githubService');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});
const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, '..', 'audit-logs', 'candidate-log.json');
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789/v1/event';

app.use(express.json());

// Simple CORS to allow local testing from file:// or local servers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/api/career-apply', async (req, res) => {
  const body = req.body || {};
  const required = ['fullName', 'email', 'appliedRole', 'yearsExperience', 'skills'];
  for (const field of required) {
    const value = body[field];
    if (value === undefined || value === null || (Array.isArray(value) ? value.length === 0 : String(value).trim() === '')) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  // Normalize skills to array
  let skills = body.skills;
  if (!Array.isArray(skills)) {
    skills = String(skills).split(',').map(s => s.trim()).filter(Boolean);
  }

  const profile = {
    id: Date.now().toString(),
    fullName: String(body.fullName).trim(),
    email: String(body.email).trim(),
    appliedRole: String(body.appliedRole).trim(),
    yearsExperience: Number(body.yearsExperience),
    skills,
    resumeUrl: body.resumeUrl ? String(body.resumeUrl).trim() : undefined,
    receivedAt: new Date().toISOString()
  };

  // Save raw request in audit log
  try {
    await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    let arr = [];
    try {
      const content = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
      arr = JSON.parse(content || '[]');
    } catch (e) {
      arr = [];
    }
    arr.push({ timestamp: new Date().toISOString(), raw: body });
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(arr, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
let assignmentTitle = `Technical Engineering Assignment for ${profile.appliedRole}`;
let assignmentRequirements = [];

if (profile.appliedRole.toLowerCase().includes('react')) {
  assignmentTitle = 'Build a Candidate Management Dashboard';
  assignmentRequirements = [
    'Build a responsive React dashboard with login authentication',
    'Create candidate listing table with search and filter',
    'Integrate one public API and display fetched data',
    `Must use: ${profile.skills.join(', ')}`,
    'Push clean modular code with multiple commits',
    'Deploy locally and document setup in README',
    'Complete submission within 3 days'
  ];
} else if (profile.appliedRole.toLowerCase().includes('node')) {
  assignmentTitle = 'Build a REST API Recruitment Backend';
  assignmentRequirements = [
    'Create Node.js + Express REST APIs for candidate management',
    'Implement CRUD operations with validation',
    'Connect MongoDB or JSON datastore',
    `Must use: ${profile.skills.join(', ')}`,
    'Write modular backend architecture',
    'Provide Postman collection and README',
    'Complete submission within 3 days'
  ];
} else {
  assignmentRequirements = [
    `Build a mini project relevant to ${profile.appliedRole}`,
    `Must use these skills: ${profile.skills.join(', ')}`,
    'Code should be pushed regularly with commits',
    'Complete and submit within 3 days'
  ];
}

let assignmentResult = {
  screening_score: Math.min(96, 68 + profile.yearsExperience * 7 + profile.skills.length * 4),
  assignment: {
    title: assignmentTitle,
    requirements: assignmentRequirements
  }
};

  // If assignmentResult is present, call githubService
  let githubRepo = null;
  if (assignmentResult && assignmentResult.assignment && assignmentResult.assignment.title && assignmentResult.assignment.requirements) {
    try {
      githubRepo = await createRepo({
        fullName: profile.fullName,
        role: profile.appliedRole,
        assignmentTitle: assignmentResult.assignment.title,
        assignmentRequirements: assignmentResult.assignment.requirements
      });
    } catch (err) {
      console.error('Failed to create GitHub repo:', err && err.message ? err.message : err);
    }
  }

  // Compose final processed candidate object
  const processedCandidate = {
    ...profile,
    assignment: assignmentResult ? assignmentResult.assignment : undefined,
    githubRepoUrl: githubRepo ? githubRepo.url : undefined,
    hrScore: assignmentResult && assignmentResult.screening_score ? assignmentResult.screening_score : undefined,
    processedAt: new Date().toISOString()
  };

  // Print professional candidate email in terminal
 if (processedCandidate.assignment && processedCandidate.githubRepoUrl) {
  const emailText = `
Dear ${processedCandidate.fullName},

Thank you for applying for the role of ${processedCandidate.appliedRole} at our company.

Your HR screening score: ${processedCandidate.hrScore || 'N/A'} / 100

We are excited to invite you to complete the following technical assignment:

Assignment: ${processedCandidate.assignment.title}

Requirements:
${processedCandidate.assignment.requirements.map(r => '- ' + r).join('\n')}

You can find your private GitHub repository here:
${processedCandidate.githubRepoUrl}

Please submit your solution within 3 days.

Best regards,
HR Team
`;

  try {
    const pdfFile = await generateAssignmentPDF(processedCandidate);
   await transporter.sendMail({
  from: process.env.SMTP_EMAIL,
  to: processedCandidate.email,
  subject: 'SensusSoft Technical Assignment — Next Steps',
  text: emailText,
  attachments: [
    {
      filename: `Technical_Assignment_${processedCandidate.fullName.replace(/\s+/g, '_')}.pdf`,
      path: pdfFile
    }
  ]
});
    console.log('Real email sent successfully to', processedCandidate.email);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

  // Save final processed candidate object in audit log
  try {
    
    await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    let arr = [];
    try {
      const content = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
      arr = JSON.parse(content || '[]');
    } catch (e) {
      arr = [];
    }
    arr.push({ timestamp: new Date().toISOString(), processed: processedCandidate });
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(arr, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write processed candidate to audit log:', err);
  }

  return res.status(201).json({
    success: true,
    profile,
    assignment: assignmentResult ? assignmentResult.assignment : undefined,
    githubRepoUrl: githubRepo ? githubRepo.url : undefined
  });
});

app.get('/', (_, res) => res.send('Webhook server running'));

module.exports = app;
