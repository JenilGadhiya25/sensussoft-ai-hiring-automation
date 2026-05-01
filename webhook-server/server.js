require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');

const normalfs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_VERCEL = !!process.env.VERCEL;

const upload = multer({ dest: IS_VERCEL ? '/tmp' : __dirname });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

async function extractResumeText(filePath) {
  try {
    const dataBuffer = normalfs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text.slice(0, 2000); // limit for token safety
  } catch (err) {
    console.error('PDF parse failed:', err.message);
    return '';
  }
}

async function generateAssignmentFromAI(profile, resumeText) {
  try {
    const prompt = `
You are a Senior Software Company HR Technical Evaluator.

Analyze the candidate resume content and generate a UNIQUE, REALISTIC technical assignment.

Candidate:
Role: ${profile.appliedRole}
Skills: ${profile.skills.join(', ')}
Experience: ${profile.yearsExperience} years

Resume Content:
${resumeText}

Instructions:
- Detect domain (healthcare, food, ecommerce, dashboard, vehicle, etc)
- Generate DIFFERENT project every time
- Do NOT generate generic tasks
- Make assignment real company-level
- UI/UX → design product task
- Full stack → full system
- Backend → APIs
- Python → automation

Return ONLY JSON:
{
"title":"",
"objective":"",
"modules":["","","",""],
"features":["","","","","",""],
"workflow":["","","","",""],
"stack":["","",""]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.3
    });

    const txt = completion.choices[0].message.content.trim();
    const clean = txt.replace(/```json/g, '').replace(/```/g, '').trim();

    console.log('AI RESPONSE:', clean);

    return JSON.parse(clean);

  } catch (err) {
    console.error('OpenAI failed:', err.message);

    return {
      title: `Custom Technical Assignment for ${profile.appliedRole}`,
      objective: 'Build a scalable real-world technical project.',
      modules: ['Core Module', 'User Module', 'Admin Panel', 'Reports'],
      features: ['CRUD', 'Auth', 'API', 'Deployment', 'Analytics'],
      workflow: ['START', 'PROCESS', 'MANAGE', 'END'],
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
    doc.moveDown();

    doc.text(`Candidate: ${candidate.fullName}`);
    doc.text(`Role: ${candidate.appliedRole}`);
    doc.text(`Score: ${candidate.hrScore}/100`);
    doc.moveDown();

    doc.text('Objective:');
    doc.text(candidate.assignment.objective);
    doc.moveDown();

    doc.text('Modules:');
    candidate.assignment.modules.forEach(m => doc.text('• ' + m));
    doc.moveDown();

    doc.text('Features:');
    candidate.assignment.features.forEach(f => doc.text('• ' + f));
    doc.moveDown();

    doc.text('Workflow:');
    doc.text(candidate.assignment.workflow.join(' → '));
    doc.moveDown();

    doc.text('Tech Stack:');
    candidate.assignment.stack.forEach(s => doc.text('• ' + s));
    doc.moveDown();

    doc.text('Deadline: 3 Days');
    doc.text('Regards, SensusSoft HR Team');

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
  });
}

app.post('/api/career-apply', upload.single('resumeFile'), async (req, res) => {
  try {
    const body = req.body;

    const profile = {
      fullName: body.fullName,
      email: body.email,
      appliedRole: body.appliedRole,
      yearsExperience: Number(body.yearsExperience),
      skills: body.skills.split(',').map(s => s.trim())
    };

    const resumeText = req.file ? await extractResumeText(req.file.path) : '';

    const aiAssignment = await generateAssignmentFromAI(profile, resumeText);

    const processedCandidate = {
      ...profile,
      assignment: aiAssignment,
      hrScore: Math.min(98, 70 + profile.yearsExperience * 5)
    };

    const pdfFile = await generateAssignmentPDF(processedCandidate);

    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: profile.email,
      subject: 'Technical Assignment',
      text: 'Please find your assignment attached.',
      attachments: [{ filename: 'Assignment.pdf', path: pdfFile }]
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/', (_, res) => {
  res.send('AI Hiring Backend Running');
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}