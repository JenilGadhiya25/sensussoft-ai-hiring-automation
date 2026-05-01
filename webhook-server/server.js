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

const TECH_ROLE_KEYWORDS = [
  'developer','engineer','software','web','frontend','backend','full stack',
  'mern','mean','app','application','designer','ui','ux','qa','tester',
  'devops','cloud','ai','ml','machine learning','data','analyst',
  'cyber','security','python','react','node','java','php','flutter',
  'android','ios','wordpress','laravel','angular','technical'
];

const TECH_SKILL_KEYWORDS = [
  'react','next.js','node','node.js','javascript','typescript','html','css',
  'mongodb','mysql','sql','firebase','python','django','flask','figma',
  'ui','ux','testing','qa','devops','docker','aws','git','github','api',
  'express','java','php','laravel','angular','flutter','dart','android',
  'ios','swift','kotlin','machine learning','ai','ml','data science',
  'cyber security','wordpress','cloud','linux','c++','c#'
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

    doc.fontSize(24).text('SensusSoft Technologies Pvt. Ltd.', { align: 'center' });
    doc.fontSize(18).text('Technical Evaluation Assignment Document', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
    doc.text(`Applied Position: ${candidate.appliedRole}`);
    doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
    doc.text(`Assignment Deadline: Within 3 Working Days`);
    doc.moveDown();

    doc.fontSize(16).text('1. Assignment Overview');
    doc.fontSize(12).text(`As part of our technical recruitment evaluation process, you are required to complete the following practical assignment titled "${candidate.assignment.title}". This assignment is intended to assess your coding standards, technical understanding, logical thinking, project structuring, and problem solving abilities in a real-world implementation scenario.`);
    doc.moveDown();

    doc.fontSize(16).text('2. Project Objective');
    doc.fontSize(12).text(`You are expected to design and develop a functional technical solution relevant to the role of ${candidate.appliedRole}. The assignment must reflect professional implementation standards and proper use of the following technologies/skills: ${candidate.assignment.requirements.join(', ')}.`);
    doc.moveDown();

    doc.fontSize(16).text('3. Functional Requirements');
    candidate.assignment.requirements.forEach((req, i) => {
      doc.fontSize(12).text(`${i+1}. ${req}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('4. Submission Guidelines');
    doc.fontSize(12).text('• Candidate must regularly push code commits to the assigned private GitHub repository.\n• Code structure should be modular, clean, and production readable.\n• README documentation must contain setup and execution instructions.\n• Proper comments should be added where required.\n• Final project must be completed within the mentioned deadline.');
    doc.moveDown();

    doc.fontSize(16).text('5. Evaluation Criteria');
    doc.fontSize(12).text('Your submission will be evaluated based on code quality, folder structure, technical accuracy, UI/UX implementation (if applicable), API handling, database design (if applicable), optimization, and documentation quality.');
    doc.moveDown();

    doc.fontSize(16).text('6. Assigned Private GitHub Repository');
    doc.fontSize(12).text(`${candidate.githubRepoUrl}`);
    doc.moveDown(2);

    doc.text('We appreciate your interest in joining SensusSoft and look forward to reviewing your technical implementation.', {
      align: 'left'
    });

    doc.moveDown(2);
    doc.text('Regards,');
    doc.text('SensusSoft HR & Technical Recruitment Team');

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

const fullName = String(body.fullName || '').trim();
const email = String(body.email || '').trim();
const appliedRole = String(body.appliedRole || '').trim();
const yearsExperience = String(body.yearsExperience || '').trim();
const rawSkills = String(body.skills || '').trim();

if (!fullName || !email || !appliedRole || !yearsExperience || !rawSkills) {
  return res.status(400).json({ error: 'Missing required fields.' });
}

let manualSkills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
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
    const roleIsTech = TECH_ROLE_KEYWORDS.some(word =>
  appliedRole.toLowerCase().includes(word)
);

const matchedSkills = mergedSkills.filter(skill =>
  TECH_SKILL_KEYWORDS.some(word => String(skill).toLowerCase().includes(word))
);

if (!roleIsTech && matchedSkills.length === 0) {
  return res.status(400).json({
    error: 'Currently we are accepting applications only for IT, Software, Technical Engineering, and Digital Technology related positions.'
  });
}

const finalSkills = matchedSkills.length > 0 ? matchedSkills : mergedSkills;

const profile = {
fullName,
email,
appliedRole,
yearsExperience: Number(yearsExperience),
skills: finalSkills
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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Webhook server running on http://localhost:${PORT}`);
  });
}