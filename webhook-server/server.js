require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { createRepo } = require('../github-demo/githubService');
const fs = require('fs').promises;
const normalfs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, '../audit-logs/candidate-log.json');
const IS_VERCEL = !!process.env.VERCEL;

const upload = multer({ dest: IS_VERCEL ? '/tmp' : __dirname });

const ALLOWED_IT_SKILLS = [
  'react','next.js','node','node.js','javascript','typescript','html','css',
  'mongodb','mysql','sql','firebase','python','django','flask',
  'figma','ui','ux','testing','qa','devops','docker','aws',
  'git','github','api','express','java','php','laravel','angular'
];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

async function generateAssignmentPDF(candidate) {
  const pdfPath = IS_VERCEL ? `/tmp/assignment-${candidate.id}.pdf` : path.join(__dirname, `assignment-${candidate.id}.pdf`);

  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = normalfs.createWriteStream(pdfPath);
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

    candidate.assignment.requirements.forEach((req, i) => doc.text(`${i+1}. ${req}`));

    doc.moveDown();
    doc.text(`Private GitHub Repository: ${candidate.githubRepoUrl}`);
    doc.end();

    stream.on('finish', () => resolve(pdfPath));
  });
}

function extractDetectedSkills(text) {
  const lower = text.toLowerCase();
  return ALLOWED_IT_SKILLS.filter(skill => lower.includes(skill));
}

app.post('/api/career-apply', upload.single('resumeFile'), async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.fullName || !body.email || !body.appliedRole || !body.yearsExperience || !body.skills) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    let manualSkills = String(body.skills).split(',').map(s => s.trim()).filter(Boolean);

    let resumeDetectedSkills = [];
    if (req.file) {
      try {
        const dataBuffer = await fs.readFile(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        resumeDetectedSkills = extractDetectedSkills(pdfData.text || '');
      } catch (err) {
        console.error('Resume parse failed:', err.message);
      }
    }

    const mergedSkills = [...new Set([...manualSkills, ...resumeDetectedSkills])];
    const matchedSkills = mergedSkills.filter(skill =>
      ALLOWED_IT_SKILLS.includes(String(skill).toLowerCase())
    );

    if (matchedSkills.length === 0) {
      return res.status(400).json({
        error: 'Currently we are accepting applications only for IT and Software related roles and skills.'
      });
    }

    const profile = {
      id: Date.now().toString(),
      fullName: String(body.fullName).trim(),
      email: String(body.email).trim(),
      appliedRole: String(body.appliedRole).trim(),
      yearsExperience: Number(body.yearsExperience),
      skills: mergedSkills,
      resumeUrl: req.file ? req.file.originalname : undefined,
      receivedAt: new Date().toISOString()
    };

    let assignmentTitle = `Technical Engineering Assignment for ${profile.appliedRole}`;
    let assignmentRequirements = [];

    if (profile.appliedRole.toLowerCase().includes('react')) {
      assignmentTitle = 'Build a Candidate Management Dashboard';
      assignmentRequirements = [
        'Build a responsive React dashboard with authentication',
        'Add candidate list with filter/search',
        'Integrate one public API',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Use modular reusable components',
        'Complete submission within 3 days'
      ];
    } else if (profile.appliedRole.toLowerCase().includes('node')) {
      assignmentTitle = 'Build a REST API Recruitment Backend';
      assignmentRequirements = [
        'Create Node.js + Express recruitment APIs',
        'Implement CRUD and validation middleware',
        'Connect MongoDB/JSON datastore',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Provide Postman documentation',
        'Complete submission within 3 days'
      ];
    } else if (profile.appliedRole.toLowerCase().includes('full stack')) {
      assignmentTitle = 'Build an End-to-End Hiring Portal';
      assignmentRequirements = [
        'Create frontend candidate form and backend API integration',
        'Store submissions and display admin listing',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Document setup in README',
        'Complete submission within 4 days'
      ];
    } else if (profile.appliedRole.toLowerCase().includes('python')) {
      assignmentTitle = 'Build a Python Data Processing Utility';
      assignmentRequirements = [
        'Create Python processing script or Flask utility',
        'Generate candidate data summary report',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Write documented functions',
        'Complete submission within 3 days'
      ];
    } else if (profile.appliedRole.toLowerCase().includes('ui/ux')) {
      assignmentTitle = 'Design a Recruitment Dashboard UI/UX Case Study';
      assignmentRequirements = [
        'Design modern recruitment dashboard in Figma',
        'Include analytics and candidate details screens',
        `Mandatory tools: ${profile.skills.join(', ')}`,
        'Share Figma file/screens',
        'Complete submission within 3 days'
      ];
    } else {
      assignmentRequirements = [
        `Build a mini technical project relevant to ${profile.appliedRole}`,
        `Mandatory skills: ${profile.skills.join(', ')}`,
        'Push code with proper commits',
        'Complete submission within 3 days'
      ];
    }

    const assignmentResult = {
      screening_score: Math.min(98, 70 + profile.yearsExperience * 6 + matchedSkills.length * 3),
      assignment: {
        title: assignmentTitle,
        requirements: assignmentRequirements
      }
    };

    let githubRepo = null;
    try {
      githubRepo = await createRepo({
        fullName: profile.fullName,
        role: profile.appliedRole,
        assignmentTitle: assignmentResult.assignment.title,
        assignmentRequirements: assignmentResult.assignment.requirements
      });
    } catch (err) {
      console.error('GitHub repo create failed:', err.message);
    }

    const processedCandidate = {
      ...profile,
      assignment: assignmentResult.assignment,
      githubRepoUrl: githubRepo ? githubRepo.url : undefined,
      hrScore: assignmentResult.screening_score,
      processedAt: new Date().toISOString()
    };

    const pdfFile = await generateAssignmentPDF(processedCandidate);

    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: processedCandidate.email,
      subject: 'SensusSoft Technical Assignment — Next Steps',
      text: `Dear ${processedCandidate.fullName},

Thank you for applying for ${processedCandidate.appliedRole} at SensusSoft.

Your HR screening score: ${processedCandidate.hrScore}/100

Please find attached your technical assignment PDF.

Private GitHub Repository:
${processedCandidate.githubRepoUrl}

Best regards,
SensusSoft HR Team`,
      attachments: [
        {
          filename: `Technical_Assignment_${processedCandidate.fullName}.pdf`,
          path: pdfFile
        }
      ]
    });

    return res.status(201).json({
      success: true,
      assignment: assignmentResult.assignment,
      githubRepoUrl: githubRepo ? githubRepo.url : undefined
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/', (_, res) => {
  res.send('SensusSoft AI Hiring Automation Backend Running');
});

module.exports = app;