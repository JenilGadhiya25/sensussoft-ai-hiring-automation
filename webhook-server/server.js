require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const normalfs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { createRepo } = require('../github-demo/githubService');
const githubWebhookHandler = require('./githubWebhookHandler');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_VERCEL = !!process.env.VERCEL;

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join('/tmp', 'candidate-log.json');
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS;

const TECH_ROLE_KEYWORDS = [
  'developer','engineer','software','web','frontend','backend','full stack',
  'mern','mean','designer','ui','ux','qa','tester','devops','cloud',
  'ai','ml','machine learning','data','analyst','cyber','security',
  'python','react','node','java','php','flutter','android','ios',
  'wordpress','laravel','angular','technical'
];

const TECH_SKILL_KEYWORDS = [
  'react','next','node','javascript','typescript','html','css','mongodb',
  'mysql','sql','firebase','python','django','flask','figma','ui','ux',
  'testing','qa','devops','docker','aws','git','github','api','express',
  'java','php','laravel','angular','flutter','dart','android','ios',
  'swift','kotlin','ai','ml','data science','cyber security','linux',
  'c++','c#','full stack'
];

app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const upload = multer({ dest: '/tmp' });

const transporter = nodemailer.createTransport({
  service:'gmail',
  auth:{ user:SMTP_EMAIL, pass:SMTP_PASS }
});

function detectRoleBucket(role){
  const r = role.toLowerCase();
  if(r.includes('frontend') || r.includes('react')) return 'frontend';
  if(r.includes('backend') || r.includes('node')) return 'backend';
  if(r.includes('ui') || r.includes('ux') || r.includes('design')) return 'uiux';
  return 'fullstack';
}

function enrichSkillsFromSignals(role,resumeText,skills){
  const set = new Set(skills.map(s=>s.trim()));
  const combined = `${role} ${resumeText}`.toLowerCase();

  if(combined.includes('react')) set.add('React');
  if(combined.includes('node')) set.add('Node.js');
  if(combined.includes('mongo')) set.add('MongoDB');
  if(combined.includes('figma')) set.add('Figma');
  if(combined.includes('javascript')) set.add('JavaScript');

  return Array.from(set);
}

function generateAssignment(bucket, skills, exp){
  let title = '';
  let modules = [];

  if(bucket === 'frontend'){
    title = 'Professional Responsive Admin Dashboard Frontend Development';
    modules = [
      'JWT Login UI',
      'Dashboard KPI Cards',
      'Reusable Sidebar/Navbar',
      'Search Sort Pagination Table',
      'Notification Drawer',
      'Responsive Mobile UI'
    ];
  }else if(bucket === 'backend'){
    title = 'Enterprise REST API Candidate Management Backend System';
    modules = [
      'Secure Login API',
      'Candidate CRUD APIs',
      'Resume Upload Endpoint',
      'JWT Authentication',
      'Admin Audit Logs',
      'Deployment Ready Backend'
    ];
  }else if(bucket === 'uiux'){
    title = 'Modern SaaS Recruitment Portal UI UX Design System';
    modules = [
      'Login Screen Design',
      'Dashboard UX Flow',
      'Candidate Profile Page',
      'Application Tracking Flow',
      'Mobile Responsive Design',
      'Prototype Submission'
    ];
  }else{
    title = 'Junior Complete Business Automation SaaS Hiring Automation Platform';
    modules = [
      'Candidate Application Portal',
      'Resume Upload Workflow',
      'Secure Admin Dashboard',
      'Assignment Generator Panel',
      'Analytics Reports',
      'Live Deployment'
    ];
  }

  return {
    projectTitle:title,
    functionalModules:modules,
    timeline:'3 Working Days'
  };
}

async function extractResumeText(file){
  try{
    if(!file) return '';
    return `Resume uploaded: ${file.originalname || 'candidate_resume.pdf'}`;
  }catch(err){
    console.log('Resume parse failed =>', err.message);
    return '';
  }
}

async function writeAuditLog(entry){
  try{
    let logs = [];
    if(normalfs.existsSync(AUDIT_LOG_PATH)){
      try{
        logs = JSON.parse(await fs.readFile(AUDIT_LOG_PATH,'utf8'));
      }catch(e){
        logs = [];
      }
    }
    logs.push(entry);
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(logs,null,2));
  }catch(err){
    console.log('Audit log failed =>', err.message);
  }
}

async function generateAssignmentPDF(candidate){
  return new Promise((resolve,reject)=>{
    try{
      const pdfPath = path.join('/tmp', `assignment-${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin:40 });
      doc.pipe(normalfs.createWriteStream(pdfPath));

      doc.fontSize(18).text('SensusSoft Technologies Pvt. Ltd.', {align:'center'});
      doc.fontSize(15).text('Candidate Personalized Technical Evaluation Assignment', {align:'center'});
      doc.moveDown();

      doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
      doc.text(`Applied Role: ${candidate.appliedRole}`);
      doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
      doc.text(`Deadline: ${candidate.assignment.timeline}`);
      doc.text(`Private GitHub Repository: ${candidate.githubRepoUrl}`);
      doc.moveDown();

      doc.fontSize(14).text('1. Assigned Project Title');
      doc.fontSize(12).text(candidate.assignment.projectTitle);
      doc.moveDown();

      doc.fontSize(14).text('2. Functional Modules');
      candidate.assignment.functionalModules.forEach((m,i)=>doc.text(`${i+1}. ${m}`));
      doc.moveDown();

      doc.fontSize(14).text('3. Recommended Stack');
      candidate.skills.forEach((s,i)=>doc.text(`${i+1}. ${s}`));
      doc.moveDown();

      doc.text('Regards,');
      doc.text('SensusSoft HR & Technical Recruitment Team');

      doc.end();
      doc.on('finish', ()=>resolve(pdfPath));
    }catch(err){
      reject(err);
    }
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

    const roleIsTech = TECH_ROLE_KEYWORDS.some(word => appliedRole.toLowerCase().includes(word));
    const skillsAreTech = skills.some(skill => TECH_SKILL_KEYWORDS.some(word => skill.toLowerCase().includes(word)));

    if(!roleIsTech && !skillsAreTech){
      return res.status(400).json({
        error:'Currently we are accepting applications only for IT and Software related positions.'
      });
    }

    const resumeText = req.file ? await extractResumeText(req.file) : '';
    const enrichedSkills = enrichSkillsFromSignals(appliedRole,resumeText,skills);
    const assignment = generateAssignment(detectRoleBucket(appliedRole), enrichedSkills, yearsExperience);

    let githubRepo = null;
    try{
      githubRepo = await createRepo({
        fullName,
        role: appliedRole,
        assignmentTitle: assignment.projectTitle,
        assignmentRequirements: assignment.functionalModules
      });
    }catch(err){
      console.log('GitHub Repo Create Failed =>', err.message);
    }

    const candidate = {
      fullName,
      email,
      appliedRole,
      yearsExperience,
      skills: enrichedSkills,
      hrScore: Math.min(98,75+(yearsExperience*3)+(enrichedSkills.length*2)),
      assignment,
      githubRepoUrl: githubRepo ? githubRepo.url : 'Repository generation pending'
    };

    const pdfFile = await generateAssignmentPDF(candidate);

    await transporter.sendMail({
      from: SMTP_EMAIL,
      to: email,
      subject: 'SensusSoft Personalized Technical Evaluation Assignment',
      text:`Dear ${fullName},

Please find attached your personalized technical assignment.

Assigned Private GitHub Repository:
${candidate.githubRepoUrl}

All source code must be pushed only on this assigned repository.

Regards,
SensusSoft HR Team`,
      attachments:[{ filename:`Technical_Assignment_${fullName}.pdf`, path:pdfFile }]
    });

    await writeAuditLog({
      submittedAt:new Date().toISOString(),
      fullName,email,appliedRole,yearsExperience,
      skills:enrichedSkills,
      githubRepoUrl:candidate.githubRepoUrl,
      assignmentTitle:assignment.projectTitle
    });

    return res.status(201).json({
      success:true,
      assignmentTitle:assignment.projectTitle,
      githubRepoUrl:candidate.githubRepoUrl
    });

  }catch(err){
    console.error('SERVER ERROR =>',err);
    return res.status(500).json({ error:'A server error occurred while processing candidate application.' });
  }
});

app.post('/api/github-submission-webhook', githubWebhookHandler);

app.get('/',(_,res)=>res.send('SensusSoft Enterprise AI Hiring Backend Running'));

module.exports = app;

if(!process.env.VERCEL){
  app.listen(PORT,()=>console.log(`Server running on http://localhost:${PORT}`));
}