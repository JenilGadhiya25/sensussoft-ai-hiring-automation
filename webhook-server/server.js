require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const normalfs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { createRepo } = require('../github-demo/githubService');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_VERCEL = !!process.env.VERCEL;

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, '..', 'audit-logs', 'candidate-log.json');
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

app.use(express.json());
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const upload = multer({ dest: IS_VERCEL ? '/tmp' : path.join(__dirname,'uploads/') });

const transporter = nodemailer.createTransport({
  service:'gmail',
  auth:{ user:SMTP_EMAIL, pass:SMTP_PASS }
});

function detectRoleBucket(role=''){
  const r = role.toLowerCase();
  if(/ui|ux|figma|designer/.test(r)) return 'uiux';
  if(/frontend|react|angular|vue|html|css|javascript/.test(r)) return 'frontend';
  if(/backend|node|express|api|server/.test(r)) return 'backend';
  if(/full stack|mern|developer|software engineer|web developer/.test(r)) return 'fullstack';
  if(/python|django|flask|automation|data/.test(r)) return 'python';
  if(/qa|tester|testing/.test(r)) return 'qa';
  if(/devops|cloud|aws/.test(r)) return 'devops';
  return 'general';
}

function enrichSkillsFromSignals(role,resumeText,skills){
  const signal = `${role} ${resumeText} ${skills.join(' ')}`.toLowerCase();
  const enriched = new Set(skills);

  if(/react|frontend|html|css|javascript/.test(signal)){
    enriched.add('React');
    enriched.add('Responsive UI');
    enriched.add('Frontend Architecture');
  }
  if(/node|backend|express|api/.test(signal)){
    enriched.add('Node.js');
    enriched.add('REST API');
    enriched.add('Database Logic');
  }
  if(/full stack|mern|developer/.test(signal)){
    enriched.add('MongoDB');
    enriched.add('Full Stack Workflow');
  }
  if(/ui|ux|figma|designer/.test(signal)){
    enriched.add('Figma');
    enriched.add('Wireframing');
    enriched.add('Prototype Design');
  }
  if(/python|automation/.test(signal)){
    enriched.add('Python Automation');
    enriched.add('Reporting Utility');
  }

  return [...enriched];
}

function generateAssignment(roleBucket, skills, yearsExperience){
  let seniority = 'Junior';
  let estimatedTime = '1-2 Hours';

  if(yearsExperience >= 5){
    seniority = 'Senior';
    estimatedTime = '6-8 Hours';
  }else if(yearsExperience >= 3){
    seniority = 'Mid Level';
    estimatedTime = '4-5 Hours';
  }

  const common = {
    seniority,
    estimatedTime,
    projectIntroduction:'This technical evaluation is designed to assess your practical implementation capability, engineering decision making, coding discipline, architecture planning, and professional project delivery standards in a real-world enterprise scenario.',
    businessObjective:'The candidate is expected to demonstrate scalable thinking, clean code quality, modular implementation, documentation discipline, and production ready delivery workflow throughout this assignment.',
    deliverables:[
      'Complete source code pushed on assigned GitHub repository',
      'Professional README.md with setup instructions',
      'Live deployed working demo URL',
      'Screenshots or short demo video',
      'Clean commit history and proper folder architecture'
    ],
    evaluationCriteria:[
      'Functional completeness of all required modules',
      'Code readability and reusable architecture',
      'Database/API/UI implementation quality',
      'Professional documentation and deployment',
      'Submission discipline and engineering maturity'
    ],
    notesHints:[
      'Use scalable enterprise folder structure',
      'Keep code reusable and modular',
      'Avoid dummy static only submissions',
      'Deployment must be functional',
      'All commits should be maintained in assigned GitHub repository'
    ],
    timeline:'3 Working Days',
    recommendedStack:skills
  };

  if(roleBucket === 'uiux'){
    return {
      ...common,
      projectTitle:`${seniority} Product UX Revamp Design Challenge`,
      overview:'You are required to redesign an outdated service booking mobile application into a modern user-friendly SaaS level UX experience using proper design methodology.',
      taskDescription:'Perform complete UX research, define user pain points, create user flow, low fidelity wireframes, high fidelity polished UI screens, interactive clickable prototype, and final design system documentation.',
      functionalModules:[
        'Competitor UX Audit',
        'User Persona Definition',
        'Complete User Journey Mapping',
        '10 to 15 High Fidelity Figma Screens',
        'Interactive Clickable Prototype',
        'Typography/Color/Components Design System'
      ]
    };
  }

  if(roleBucket === 'frontend'){
    return {
      ...common,
      projectTitle:`${seniority} SaaS Analytics Dashboard Frontend Development`,
      overview:'Build a responsive enterprise analytics dashboard interface similar to a real business admin reporting product.',
      taskDescription:'Candidate must create secure login screen, KPI cards, charts section, user management table, search filters, notification widgets, and mobile responsive layout using reusable frontend components.',
      functionalModules:[
        'Authentication UI',
        'KPI Metrics Dashboard',
        'Analytics Charts',
        'Data Tables with Search Filter',
        'Notification Center',
        'Responsive Device Support'
      ]
    };
  }

  if(roleBucket === 'backend'){
    return {
      ...common,
      projectTitle:`${seniority} Recruitment Management REST API Backend`,
      overview:'Develop a secure backend recruitment management system exposing production level REST APIs for candidate and admin workflow management.',
      taskDescription:'Candidate should build authentication, candidate CRUD, interview scheduler, admin role access, reporting endpoints, and API documentation with proper database architecture.',
      functionalModules:[
        'JWT Authentication APIs',
        'Candidate CRUD APIs',
        'Interview Scheduler APIs',
        'Admin Role Authorization',
        'Analytics Reporting APIs',
        'Swagger/Postman Documentation'
      ]
    };
  }

  if(roleBucket === 'python'){
    return {
      ...common,
      projectTitle:`${seniority} Python Resume Data Automation Utility`,
      overview:'Build a Python based bulk resume processing automation utility for parsing, validating, and generating candidate summary reports.',
      taskDescription:'Candidate must process multiple candidate records, validate missing fields, create summary analytics, export final reports, and maintain execution logs.',
      functionalModules:[
        'Bulk Resume Parser',
        'Data Validation Engine',
        'Candidate Summary Generator',
        'CSV/PDF Report Export',
        'Automation Logging',
        'CLI Execution Utility'
      ]
    };
  }

  return {
    ...common,
    projectTitle:`${seniority} Complete Hiring Automation SaaS Platform`,
    overview:'Build an end-to-end technical recruitment automation platform which handles candidate applications, admin review, assignment generation, and reporting workflows.',
    taskDescription:'Candidate must create frontend application form, backend APIs, resume processing, admin dashboard, assignment panel, analytics reporting, and complete deployment ready project architecture.',
    functionalModules:[
      'Candidate Application Portal',
      'Resume Upload Processing',
      'Secure Admin Dashboard',
      'Assignment Generator Module',
      'Analytics Reporting',
      'Live Deployment Ready System'
    ]
  };
}

async function extractResumeText(file){
  try{
    return `${file.originalname || ''} ${file.mimetype || ''}`.toLowerCase();
  }catch{
    return '';
  }
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
  const pdfPath = IS_VERCEL
    ? `/tmp/assignment-${Date.now()}.pdf`
    : path.join(__dirname,`assignment-${Date.now()}.pdf`);

  return new Promise((resolve)=>{
    const doc = new PDFDocument({margin:45});
    const stream = normalfs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(21).text('SensusSoft Technologies Pvt. Ltd.',{align:'center'});
    doc.fontSize(14).text('Candidate Personalized Technical Evaluation Assignment',{align:'center'});
    doc.moveDown(2);

    doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
    doc.text(`Applied Role: ${candidate.appliedRole}`);
    doc.text(`Seniority Level: ${candidate.assignment.seniority}`);
    doc.text(`Estimated Task Time: ${candidate.assignment.estimatedTime}`);
    doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
    doc.text(`Deadline: ${candidate.assignment.timeline}`);
    doc.text(`Private GitHub Repository: ${candidate.githubRepoUrl}`);
    doc.moveDown();

    doc.fontSize(16).text('1. Assigned Project Title');
    doc.fontSize(12).text(candidate.assignment.projectTitle);
    doc.moveDown();

    doc.fontSize(16).text('2. Project Overview');
    doc.fontSize(12).text(candidate.assignment.overview);
    doc.moveDown();

    doc.fontSize(16).text('3. Task Description');
    doc.fontSize(12).text(candidate.assignment.taskDescription);
    doc.moveDown();

    doc.fontSize(16).text('4. Project Introduction');
    doc.fontSize(12).text(candidate.assignment.projectIntroduction);
    doc.moveDown();

    doc.fontSize(16).text('5. Business Objective');
    doc.fontSize(12).text(candidate.assignment.businessObjective);
    doc.moveDown();

    doc.fontSize(16).text('6. Functional Modules');
    candidate.assignment.functionalModules.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });

    doc.addPage();

    doc.fontSize(16).text('7. Deliverables');
    candidate.assignment.deliverables.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('8. Evaluation Criteria');
    candidate.assignment.evaluationCriteria.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('9. Recommended Technology Stack');
    candidate.assignment.recommendedStack.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.fontSize(16).text('10. Important Notes & Hints');
    candidate.assignment.notesHints.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });

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

    const roleIsTech = TECH_ROLE_KEYWORDS.some(word =>
      appliedRole.toLowerCase().includes(word)
    );

    const skillsAreTech = skills.some(skill =>
      TECH_SKILL_KEYWORDS.some(word => skill.toLowerCase().includes(word))
    );

    if(!roleIsTech && !skillsAreTech){
      return res.status(400).json({
        error:'Currently we are accepting applications only for IT and Software related positions.'
      });
    }

    const resumeText = req.file ? await extractResumeText(req.file) : '';
    const enrichedSkills = enrichSkillsFromSignals(appliedRole,resumeText,skills);

    const assignment = generateAssignment(
      detectRoleBucket(appliedRole),
      enrichedSkills,
      yearsExperience
    );

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

Congratulations.

Based on initial HR technical screening, your profile has been shortlisted for the next technical evaluation round.

Please find attached your personalized technical assignment document.

Assigned Private GitHub Repository:
${candidate.githubRepoUrl}

Important:
- All source code must be pushed only on the assigned repository
- Final submission timeline is ${candidate.assignment.timeline}
- Follow all instructions mentioned inside PDF document

Regards,
SensusSoft HR Team`,
      attachments:[
        {
          filename:`Technical_Assignment_${fullName}.pdf`,
          path:pdfFile
        }
      ]
    });

    await writeAuditLog({
      submittedAt:new Date().toISOString(),
      fullName,
      email,
      appliedRole,
      yearsExperience,
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
    return res.status(500).json({
      error:'A server error occurred while processing candidate application.'
    });
  }
});

app.get('/',(_,res)=>res.send('SensusSoft Enterprise AI Hiring Backend Running'));

module.exports = app;

if(!process.env.VERCEL){
  app.listen(PORT,()=>console.log(`Server running on http://localhost:${PORT}`));
}