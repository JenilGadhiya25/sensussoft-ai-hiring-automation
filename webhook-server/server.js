require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const normalfs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_VERCEL = !!process.env.VERCEL;

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, '..', 'audit-logs', 'candidate-log.json');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS;

app.use(express.json());
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const upload = multer({ dest: IS_VERCEL ? '/tmp' : path.join(__dirname, 'uploads/') });

const transporter = nodemailer.createTransport({
  service:'gmail',
  auth:{ user:SMTP_EMAIL, pass:SMTP_PASS }
});

function detectRoleBucket(role=''){
  const r = role.toLowerCase();
  if(/ui|ux|product designer|web designer|figma|graphic/.test(r)) return 'uiux';
  if(/frontend|react|angular|vue|html|css|javascript/.test(r)) return 'frontend';
  if(/backend|node|express|api developer|server/.test(r)) return 'backend';
  if(/full stack|mern|mean|software engineer|web developer|developer/.test(r)) return 'fullstack';
  if(/python|flask|django|automation|data/.test(r)) return 'python';
  if(/qa|tester|testing/.test(r)) return 'qa';
  if(/devops|cloud|aws|deployment/.test(r)) return 'devops';
  return 'general';
}

function detectBusinessDomain(text=''){
  const t = text.toLowerCase();
  if(/health|doctor|patient|medical|hospital/.test(t)) return 'Healthcare';
  if(/shop|ecommerce|cart|product/.test(t)) return 'Ecommerce';
  if(/food|restaurant|delivery/.test(t)) return 'Food Delivery';
  if(/finance|bank|wallet|payment/.test(t)) return 'Fintech';
  if(/travel|hotel|booking/.test(t)) return 'Travel';
  if(/school|student|education/.test(t)) return 'Education';
  if(/crm|lead|sales/.test(t)) return 'CRM';
  return 'Business Automation';
}

function smartFallbackAssignment(roleBucket, domain, skills){
  const maps = {
    uiux: {
      title:`Design a Premium ${domain} User Experience Platform`,
      intro:`Create a full enterprise UI/UX case study and clickable prototype for a ${domain} based mobile/web application.`,
      objective:`The company wants a world-class digital user journey that improves usability, engagement, retention and conversion.`,
      modules:[
        'Market Research and Competitor UX Analysis',
        'User Persona Mapping and Journey Flow',
        'Low Fidelity Wireframe Blueprint',
        'High Fidelity Figma Screen Design',
        'Interactive Prototype with Click Flow',
        'Design System and Component Documentation'
      ]
    },
    frontend: {
      title:`Build a Responsive ${domain} Admin Dashboard`,
      intro:`Develop a frontend production grade dashboard system with modern UI, graphs, and reusable components.`,
      objective:`The dashboard should help business managers monitor and control all ${domain} operations efficiently.`,
      modules:[
        'Secure Login Interface',
        'Dashboard Analytics Cards',
        'Advanced Listing Tables',
        'Search Filter and Pagination',
        'Notification and Settings Screens',
        'Responsive Mobile UI'
      ]
    },
    backend: {
      title:`Develop a ${domain} Enterprise REST API`,
      intro:`Build a secure backend architecture for business process automation.`,
      objective:`The APIs must handle all operational data flow, validations, security and admin reporting.`,
      modules:[
        'JWT Auth APIs',
        'Master CRUD APIs',
        'Role Middleware',
        'Admin Reports',
        'Status Workflow APIs',
        'Swagger Documentation'
      ]
    },
    fullstack: {
      title:`Build a Complete ${domain} SaaS Hiring Platform`,
      intro:`Create a full frontend + backend + admin + analytics enterprise application.`,
      objective:`Digitize and automate the entire ${domain} business lifecycle with scalable architecture.`,
      modules:[
        'Public Candidate/User Portal',
        'Secure Admin Dashboard',
        'Backend API Architecture',
        'Database Workflow Management',
        'Analytics & Reports',
        'Live Deployment'
      ]
    },
    python: {
      title:`Create a ${domain} Python Data Automation Suite`,
      intro:`Build a python utility that automates records, analytics and export reports.`,
      objective:`Reduce manual business processing and improve data insights.`,
      modules:[
        'Data Input Parser',
        'Validation Engine',
        'Analytics Processor',
        'Summary Report Generator',
        'Charts Export',
        'Automation Logs'
      ]
    },
    qa: {
      title:`Build QA Testing Suite for ${domain} Application`,
      intro:`Create manual + automation testing framework.`,
      objective:`Ensure bug free production quality delivery.`,
      modules:[
        'Manual Test Case Sheet',
        'Automation Script Pack',
        'API Testing',
        'Bug Tracking',
        'Regression Testing',
        'Coverage Report'
      ]
    },
    devops: {
      title:`Build CI/CD Pipeline for ${domain} Cloud App`,
      intro:`Automate build, test and deployment pipeline.`,
      objective:`Improve release speed and infrastructure reliability.`,
      modules:[
        'Git Pipeline',
        'Docker Setup',
        'Auto Testing',
        'Cloud Deployment',
        'Monitoring',
        'Rollback Strategy'
      ]
    },
    general: {
      title:`Build a Custom ${domain} Technical Project`,
      intro:`Develop a role specific practical software engineering project.`,
      objective:`Demonstrate coding, planning, architecture and production understanding.`,
      modules:[
        'Planning',
        'Architecture',
        'Development',
        'Testing',
        'Deployment',
        'Documentation'
      ]
    }
  };

  const base = maps[roleBucket];

  return {
    projectTitle: base.title,
    projectIntroduction: base.intro,
    businessObjective: base.objective,
    functionalModules: base.modules,
    technicalRequirements: [
      `Use candidate relevant stack: ${skills.join(', ') || 'Role based technologies'}`,
      'Professional folder architecture',
      'Clean coding standards',
      'Deployment ready build',
      'README documentation',
      'Production level submission'
    ],
    deliverables:[
      'Complete source code',
      'Live deployed URL',
      'Setup documentation',
      'Screenshots or demo video'
    ],
    evaluationCriteria:[
      'Architecture Quality',
      'Feature Completeness',
      'Code Standard',
      'Business Logic Understanding'
    ],
    timeline:'3 Working Days',
    recommendedStack: skills.length ? skills : ['Role Based Stack']
  };
}

async function extractResumeText(file){
  try{
    let txt = '';
    txt += ' ' + (file.originalname || '');
    txt += ' ' + (file.mimetype || '');
    return txt;
  }catch{
    return '';
  }
}

async function generateAssignmentWithAI(role,resumeText,skills){
  const roleBucket = detectRoleBucket(role);
  const domain = detectBusinessDomain(resumeText);

  return smartFallbackAssignment(roleBucket,domain,skills);
}

async function writeAuditLog(entry){
  try{
    const dir = path.dirname(AUDIT_LOG_PATH);
    if(!normalfs.existsSync(dir)) normalfs.mkdirSync(dir,{recursive:true});

    let arr = [];
    if(normalfs.existsSync(AUDIT_LOG_PATH)){
      arr = JSON.parse(await fs.readFile(AUDIT_LOG_PATH,'utf8'));
      if(!Array.isArray(arr)) arr = [];
    }

    arr.push(entry);
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(arr,null,2));
  }catch(err){
    console.log(err.message);
  }
}

async function generateAssignmentPDF(candidate){
  const pdfPath = IS_VERCEL ? `/tmp/assignment-${Date.now()}.pdf` : path.join(__dirname,`assignment-${Date.now()}.pdf`);

  return new Promise((resolve)=>{
    const doc = new PDFDocument({margin:50});
    const stream = normalfs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(22).text('SensusSoft Technologies Pvt. Ltd.',{align:'center'});
    doc.fontSize(14).text('Candidate Personalized Technical Evaluation Assignment',{align:'center'});
    doc.moveDown(2);

    doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
    doc.text(`Applied Role: ${candidate.appliedRole}`);
    doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
    doc.text(`Deadline: ${candidate.assignment.timeline}`);
    doc.moveDown();

    doc.fontSize(16).text('1. Assigned Project Title');
    doc.fontSize(12).text(candidate.assignment.projectTitle);
    doc.moveDown();

    doc.fontSize(16).text('2. Project Introduction');
    doc.fontSize(12).text(candidate.assignment.projectIntroduction);
    doc.moveDown();

    doc.fontSize(16).text('3. Business Objective');
    doc.fontSize(12).text(candidate.assignment.businessObjective);
    doc.moveDown();

    doc.fontSize(16).text('4. Functional Modules');
    candidate.assignment.functionalModules.forEach((m,i)=>doc.fontSize(12).text(`${i+1}. ${m}`));
    doc.moveDown();

    doc.fontSize(16).text('5. Technical Requirements');
    candidate.assignment.technicalRequirements.forEach((m,i)=>doc.fontSize(12).text(`${i+1}. ${m}`));
    doc.addPage();

    doc.fontSize(16).text('6. Deliverables');
    candidate.assignment.deliverables.forEach((m,i)=>doc.fontSize(12).text(`${i+1}. ${m}`));
    doc.moveDown();

    doc.fontSize(16).text('7. Evaluation Criteria');
    candidate.assignment.evaluationCriteria.forEach((m,i)=>doc.fontSize(12).text(`${i+1}. ${m}`));
    doc.moveDown();

    doc.fontSize(16).text('8. Recommended Stack');
    candidate.assignment.recommendedStack.forEach((m,i)=>doc.fontSize(12).text(`${i+1}. ${m}`));
    doc.moveDown(2);

    doc.text('Regards,');
    doc.text('SensusSoft HR & Technical Recruitment Team');

    doc.end();
    stream.on('finish',()=>resolve(pdfPath));
  });
}

app.post('/api/career-apply', upload.single('resumeFile'), async (req,res)=>{
  try{
    const body = req.body || {};
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim();
    const appliedRole = String(body.appliedRole || '').trim();
    const yearsExperience = Number(body.yearsExperience || 0);
    const skills = String(body.skills || '').split(',').map(s=>s.trim()).filter(Boolean);

    if(!fullName || !email || !appliedRole){
      return res.status(400).json({error:'Missing required fields'});
    }

    const resumeText = req.file ? await extractResumeText(req.file) : '';
    const assignment = await generateAssignmentWithAI(appliedRole,resumeText,skills);

    const candidate = {
      fullName,
      email,
      appliedRole,
      yearsExperience,
      skills,
      hrScore: Math.min(98,72+(yearsExperience*4)+(skills.length*2)),
      assignment
    };

    const pdfFile = await generateAssignmentPDF(candidate);

    await transporter.sendMail({
      from: SMTP_EMAIL,
      to: email,
      subject: 'SensusSoft Technical Evaluation Assignment',
      text:`Dear ${fullName}, Please find attached your personalized technical assignment.`,
      attachments:[{ filename:`Technical_Assignment_${fullName}.pdf`, path:pdfFile }]
    });

    await writeAuditLog({
      submittedAt:new Date().toISOString(),
      fullName,email,appliedRole,yearsExperience,skills
    });

    return res.status(201).json({success:true, assignmentTitle:assignment.projectTitle});

  }catch(err){
    console.error('SERVER ERROR =>',err);
    return res.status(500).json({error:'A server error occurred while processing candidate application.'});
  }
});

app.get('/',(_,res)=>res.send('SensusSoft Enterprise AI Hiring Backend Running'));

module.exports = app;

if(!process.env.VERCEL){
  app.listen(PORT,()=>console.log(`Server running on http://localhost:${PORT}`));
}