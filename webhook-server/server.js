require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const { OpenAI } = require('openai');

const normalfs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_VERCEL = !!process.env.VERCEL;

const upload = multer({ dest: IS_VERCEL ? '/tmp' : __dirname });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

async function generateAssignmentFromAI(profile, resumeHint = '') {
  try {
    const uniqueSeed = Date.now();

    const prompt = `
You are a Senior HR Technical Evaluator at a top software company.

Generate a COMPLETELY DIFFERENT and UNIQUE technical assignment documentation for this candidate.

Candidate Name: ${profile.fullName}
Applied Role: ${profile.appliedRole}
Technical Skills: ${profile.skills.join(', ')}
Experience: ${profile.yearsExperience} years
Resume File Hint: ${resumeHint}
Unique Variation Seed: ${uniqueSeed}

STRICT RULES:
- Every response must have a DIFFERENT software product/project idea.
- Do not generate generic admin panel tasks repeatedly.
- Make assignment highly role specific.
- Use practical company-level project names.
- UI/UX roles should get product design tasks.
- Frontend roles should get dashboard/app UI tasks.
- Backend roles should get API/server tasks.
- Full stack roles should get complete software platform tasks.
- Python roles should get automation/data processing tasks.
- Add realistic modules/features/workflow.

Return ONLY pure valid JSON:
{
"title":"",
"objective":"",
"modules":["","","",""],
"features":["","","","","",""],
"workflow":["","","","",""],
"stack":["","","",""]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.25
    });

    const txt = completion.choices[0].message.content.trim();
    const clean = txt.replace(/```json/g, '').replace(/```/g, '').trim();

    console.log('OPENAI RAW RESPONSE => ', clean);

    return JSON.parse(clean);

  } catch (err) {
    console.error('OpenAI generation failed:', err.message);

    return {
      title: `Custom Technical Product Build for ${profile.appliedRole}`,
      objective: `Build a unique practical software engineering solution relevant to ${profile.appliedRole} using advanced real-world implementation standards.`,
      modules: ['Admin Control Center', 'Workflow Engine', 'User Interaction Module', 'Analytics Reports'],
      features: ['Authentication', 'Advanced CRUD', 'Status Tracking', 'API Integration', 'Reporting', 'Deployment'],
      workflow: ['INITIATE', 'PROCESS', 'MANAGE', 'TRACK', 'DELIVER'],
      stack: profile.skills
    };
  }
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

    doc.fontSize(14).text('1. Project Objective');
    doc.fontSize(12).text(candidate.assignment.objective);
    doc.moveDown();

    doc.fontSize(14).text('2. Suggested Development Modules');
    candidate.assignment.modules.forEach(m => doc.text('• ' + m));
    doc.moveDown();

    doc.fontSize(14).text('3. Core Functional Features');
    candidate.assignment.features.forEach(f => doc.text('• ' + f));
    doc.moveDown();

    doc.fontSize(14).text('4. System Workflow');
    doc.fontSize(12).text(candidate.assignment.workflow.join(' → '));
    doc.moveDown();

    doc.fontSize(14).text('5. Functional Requirements');
    candidate.assignment.features.forEach((f,i) => doc.text(`${i+1}. ${f}`));
    doc.moveDown();

    doc.fontSize(14).text('6. Non Functional Requirements');
    doc.fontSize(12).text('• High performance\n• Secure implementation\n• Clean UI/UX\n• Scalable architecture\n• Production ready coding standards');
    doc.moveDown();

    doc.fontSize(14).text('7. Mandatory Technology Stack');
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
    const aiAssignment = await generateAssignmentFromAI(profile, resumeHint);

    const processedCandidate = {
      ...profile,
      assignment: aiAssignment,
      hrScore: Math.min(98, 70 + profile.yearsExperience * 6 + matchedSkills.length * 3)
    };

    const pdfFile = await generateAssignmentPDF(processedCandidate);

    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: processedCandidate.email,
      subject: 'SensusSoft Technical Assignment — Next Steps',
      text: `Dear ${processedCandidate.fullName},

Thank you for applying for ${processedCandidate.appliedRole} at SensusSoft.

Your HR screening score: ${processedCandidate.hrScore}/100

Please find attached your AI generated custom technical assignment PDF.

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
      assignment: aiAssignment
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