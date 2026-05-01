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

function buildDynamicAssignment(profile, resumeHint = '') {
  const role = profile.appliedRole.toLowerCase();
  const lowerResume = resumeHint.toLowerCase();

  let projectName = 'Professional Software Development System';
  let objective = 'Build a scalable industry-grade software solution.';
  let modules = [];
  let features = [];
  let workflow = [];

  if (lowerResume.includes('doctor') || lowerResume.includes('health')) {
    projectName = 'Multi Doctor Healthcare Booking System';
    modules = ['Patient Panel','Doctor Panel','Admin Dashboard','Appointment Engine'];
    features = ['Doctor listing','Appointment booking','Prescription upload','Admin reports','Secure login'];
    workflow = ['PATIENT REGISTER','BOOK APPOINTMENT','DOCTOR APPROVE','CONSULTATION','REPORT'];
  } else if (lowerResume.includes('food') || lowerResume.includes('restaurant')) {
    projectName = 'Online Food Ordering and Delivery Platform';
    modules = ['Customer App','Restaurant Panel','Delivery Panel','Admin Dashboard'];
    features = ['Menu listing','Cart order','Live order tracking','Payment flow','Restaurant reports'];
    workflow = ['USER ORDER','RESTAURANT ACCEPT','DELIVERY PROCESS','ORDER COMPLETE'];
  } else if (lowerResume.includes('vehicle') || lowerResume.includes('car')) {
    projectName = 'Vehicle Service Management System';
    modules = ['Check-in Panel','Advisor Dashboard','Job Card Manager','Reports'];
    features = ['Vehicle check-in','Service advisor assign','Job status tracking','Time reports','Admin control'];
    workflow = ['CHECKED_IN','ASSIGN_ADVISOR','IN_SERVICE','QC','DELIVERED'];
  } else if (role.includes('react') || role.includes('frontend')) {
    projectName = 'Enterprise Employee Management Dashboard';
    modules = ['Admin UI','Dashboard','Employee CRUD','Analytics'];
    features = ['Responsive design','Search/filter','Protected routes','API integration','Charts'];
    workflow = ['LOGIN','VIEW DASHBOARD','MANAGE EMPLOYEES','REPORTS'];
  } else if (role.includes('node') || role.includes('backend')) {
    projectName = 'Recruitment REST API Backend System';
    modules = ['Auth APIs','Candidate CRUD APIs','Database Layer','Admin APIs'];
    features = ['JWT auth','Middleware validation','MongoDB','REST docs','Deployment'];
    workflow = ['REQUEST','VALIDATE','PROCESS','STORE','RESPONSE'];
  } else if (role.includes('python')) {
    projectName = 'Python Data Automation Utility';
    modules = ['Automation Engine','Processor','Report Generator'];
    features = ['Data extraction','Automation','Export reports','CLI utility'];
    workflow = ['INPUT','PROCESS','ANALYZE','EXPORT'];
  } else {
    projectName = 'Complete Hiring Management Web Application';
    modules = ['Frontend Form','Backend APIs','Admin Dashboard','Status Reports'];
    features = ['Form submission','Candidate management','Status workflow','Deployment','Reports'];
    workflow = ['SUBMIT','ADMIN REVIEW','STATUS UPDATE','FINAL REPORT'];
  }

  return {
    title: projectName,
    objective,
    modules,
    features,
    workflow,
    stack: profile.skills
  };
}

async function generateAssignmentPDF(candidate) {
  const pdfPath = IS_VERCEL
    ? `/tmp/assignment-${Date.now()}.pdf`
    : path.join(__dirname, `assignment-${Date.now()}.pdf`);

  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = normalfs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(22).text('SensusSoft Software Pvt. Ltd.', { align: 'center' });
    doc.fontSize(18).text(candidate.assignment.title, { align: 'center' });
    doc.fontSize(14).text(`(${candidate.skills.join(' + ')})`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
    doc.text(`Applied Position: ${candidate.appliedRole}`);
    doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
    doc.text(`Submission Deadline: Within 3 Working Days`);
    doc.moveDown();

    doc.fontSize(14).text('1. Objective');
    doc.fontSize(12).text(candidate.assignment.objective);
    doc.moveDown();

    doc.fontSize(14).text('2. Suggested Modules');
    candidate.assignment.modules.forEach(m => doc.text('• ' + m));
    doc.moveDown();

    doc.fontSize(14).text('3. Core Features');
    candidate.assignment.features.forEach(f => doc.text('• ' + f));
    doc.moveDown();

    doc.fontSize(14).text('4. Workflow / System Flow');
    doc.fontSize(12).text(candidate.assignment.workflow.join(' → '));
    doc.moveDown();

    doc.fontSize(14).text('5. Functional Requirements');
    candidate.assignment.features.forEach((f,i) => doc.text(`${i+1}. ${f}`));
    doc.moveDown();

    doc.fontSize(14).text('6. Non Functional Requirements');
    doc.fontSize(12).text('• Fast performance\n• Secure APIs\n• Clean UI\n• Scalable database design\n• Production ready code');
    doc.moveDown();

    doc.fontSize(14).text('7. Technology Stack');
    candidate.assignment.stack.forEach(t => doc.text('• ' + t));
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

    const resumeHint = req.file ? req.file.originalname || '' : '';
    const assignmentResult = {
      screening_score: Math.min(98, 70 + profile.yearsExperience * 6 + matchedSkills.length * 3),
      assignment: buildDynamicAssignment(profile, resumeHint)
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