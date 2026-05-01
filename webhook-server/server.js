require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const multer = require('multer');

const normalfs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
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
  'cyber security','wordpress','cloud','linux','c++','c#','full stack'
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
  const pdfPath = IS_VERCEL
    ? `/tmp/assignment-${Date.now()}.pdf`
    : path.join(__dirname, `assignment-${Date.now()}.pdf`);

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
    doc.fontSize(12).text(`You are required to complete the professional technical assignment titled "${candidate.assignment.title}". This evaluation measures coding quality, architecture, debugging, deployment knowledge and documentation discipline.`);
    doc.moveDown();

    doc.fontSize(16).text('2. Project Objective');
    doc.fontSize(12).text(`The assignment must be developed according to industry implementation standards using the following technologies: ${candidate.assignment.requirements.join(', ')}.`);
    doc.moveDown();

    doc.fontSize(16).text('3. Functional Requirements');
    candidate.assignment.requirements.forEach((req, i) => {
      doc.fontSize(12).text(`${i + 1}. ${req}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('4. Submission Guidelines');
    doc.fontSize(12).text('• Maintain proper project structure.\n• Add README setup instructions.\n• Use comments where needed.\n• Final delivery must be within deadline.\n• Share source code zip or GitHub link by email.');
    doc.moveDown();

    doc.fontSize(16).text('5. Evaluation Criteria');
    doc.fontSize(12).text('Evaluation will be based on technical accuracy, clean coding practices, architecture, API/database logic, deployment understanding, documentation, and production readiness.');
    doc.moveDown(2);

    doc.text('Regards,');
    doc.text('SensusSoft HR & Technical Recruitment Team');

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
  });
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
    const mergedSkills = [...new Set([...manualSkills])];

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
      assignmentTitle = 'Enterprise Candidate Management Dashboard';
      assignmentRequirements = [
        'Build complete responsive React admin dashboard',
        'Add login authentication and protected routing',
        'Create candidate table with search, filter, edit, delete',
        'Integrate public API and analytics cards',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Deploy and document in README'
      ];
    } else if (profile.appliedRole.toLowerCase().includes('node')) {
      assignmentTitle = 'Recruitment REST API Backend System';
      assignmentRequirements = [
        'Create Node.js + Express production backend',
        'CRUD APIs with middleware validation',
        'MongoDB or JSON storage integration',
        'Postman API documentation',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Deploy backend and document usage'
      ];
    } else if (profile.appliedRole.toLowerCase().includes('full stack')) {
      assignmentTitle = 'Complete Hiring Management Web Application';
      assignmentRequirements = [
        'Build frontend candidate application form',
        'Build backend API submission handling',
        'Create admin panel to view all candidates',
        'Add login system and candidate status management',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Deploy full project live with README'
      ];
    } else if (profile.appliedRole.toLowerCase().includes('python')) {
      assignmentTitle = 'Python Candidate Data Automation Utility';
      assignmentRequirements = [
        'Build Python/Flask automation utility',
        'Process candidate records and generate reports',
        'Create exportable summary file',
        `Mandatory stack: ${profile.skills.join(', ')}`,
        'Document execution process'
      ];
    } else {
      assignmentRequirements = [
        `Build a professional technical project relevant to ${profile.appliedRole}`,
        `Mandatory technologies: ${profile.skills.join(', ')}`,
        'Use production level folder structure',
        'Deploy live and document complete project setup',
        'Share source code submission professionally'
      ];
    }

    const assignmentResult = {
      screening_score: Math.min(98, 70 + profile.yearsExperience * 6 + matchedSkills.length * 3),
      assignment: {
        title: assignmentTitle,
        requirements: assignmentRequirements
      }
    };

    const processedCandidate = {
      ...profile,
      assignment: assignmentResult.assignment,
      hrScore: assignmentResult.screening_score
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
      assignment: assignmentResult.assignment
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