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
    enriched.add('Prototype');
  }
  if(/python|automation/.test(signal)){
    enriched.add('Python Automation');
    enriched.add('Reporting');
  }

  return [...enriched];
}

function generateAssignment(roleBucket, skills, yearsExperience){
  let seniority = 'Junior';
  if(yearsExperience >= 5) seniority = 'Senior';
  else if(yearsExperience >= 3) seniority = 'Mid Level';

  const base = {
    projectIntroduction:'Candidate is required to build an enterprise-grade practical software solution demonstrating production-level coding discipline, architecture understanding, UI/UX quality, deployment readiness, and documentation practices.',
    businessObjective:'The objective of this evaluation is to assess the candidate’s real-world implementation thinking, scalability approach, debugging capability, clean coding standards, and professional delivery mindset.',
    technicalRequirements:[
      `Mandatory technology stack: ${skills.join(', ')}`,
      'Maintain scalable folder architecture',
      'Use reusable components/modules',
      'Deployment ready implementation',
      'Professional README documentation',
      'Screenshots/demo proof'
    ],
    deliverables:[
      'Complete source code in assigned GitHub repository',
      'Live deployed URL',
      'README setup instructions',
      'Screenshots or demo recording'
    ],
    evaluationCriteria:[
      'Code quality and standards',
      'Feature completeness',
      'Architecture understanding',
      'Professional submission quality'
    ],
    timeline:'3 Working Days',
    recommendedStack:skills
  };

  if(roleBucket === 'uiux'){
    return {
      ...base,
      projectTitle:`${seniority} UX Modernization Design Case Study`,
      functionalModules:[
        'Competitor UX Research',
        'User Journey Mapping',
        'Wireframe Planning',
        '15+ High Fidelity Figma Screens',
        'Clickable Prototype',
        'Design System Guidelines'
      ]
    };
  }

  if(roleBucket === 'frontend'){
    return {
      ...base,
      projectTitle:`${seniority} Enterprise Analytics Dashboard Frontend`,
      functionalModules:[
        'Secure Login UI',
        'Dashboard KPI Cards',
        'Data Listing Tables',
        'Search Filter Pagination',
        'Notification Center',
        'Responsive Mobile Design'
      ]
    };
  }

  if(roleBucket === 'backend'){
    return {
      ...base,
      projectTitle:`${seniority} Recruitment REST API Backend System`,
      functionalModules:[
        'JWT Authentication APIs',
        'Candidate CRUD APIs',
        'Admin Authorization',
        'Interview Scheduling APIs',
        'Analytics Reports APIs',
        'Swagger Documentation'
      ]
    };
  }

  if(roleBucket === 'python'){
    return {
      ...base,
      projectTitle:`${seniority} Python Data Automation Utility`,
      functionalModules:[
        'Bulk Data Parser',
        'Validation Engine',
        'Summary Analytics',
        'Export Reports',
        'Automation Logs',
        'Execution Utility'
      ]
    };
  }

  return {
    ...base,
    projectTitle:`${seniority} Complete SaaS Hiring Automation Platform`,
    functionalModules:[
      'Candidate Application Portal',
      'Resume Upload Workflow',
      'Secure Admin Dashboard',
      'Assignment Generator Panel',
      'Analytics Reports',
      'Live Deployment'
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
  const pdfPath = IS_VERCEL ? `/tmp/assignment-${Date.now()}.pdf` : path.join(__dirname,`assignment-${Date.now()}.pdf`);

  return new Promise((resolve)=>{
    const doc = new PDFDocument({margin:45});
    const stream = normalfs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(22).text('SensusSoft Technologies Pvt. Ltd.',{align:'center'});
    doc.fontSize(15).text('Candidate Personalized Technical Evaluation Assignment Document',{align:'center'});
    doc.moveDown(2);

    doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
    doc.text(`Applied Role: ${candidate.appliedRole}`);
    doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
    doc.text(`Deadline: ${candidate.assignment.timeline}`);
    doc.text(`Private GitHub Repository: ${candidate.githubRepoUrl}`);
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

    doc.fontSize(16).text('8. Recommended Technology Stack');
    candidate.assignment.recommendedStack.forEach((m,i)=>doc.fontSize(12).text(`${i+1}. ${m}`));
    doc.moveDown();

    doc.fontSize(16).text('9. Submission Notes');
    doc.fontSize(12).text('• Candidate must push all project commits to assigned GitHub repository.');
    doc.text('• Use proper enterprise folder structure and code comments.');
    doc.text('• README installation steps are mandatory.');
    doc.text('• Live deployment URL must be submitted.');
    doc.text('• Final delivery should be completed within deadline.');

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
      hrScore: Math.min(98,72+(yearsExperience*4)+(enrichedSkills.length*2)),
      assignment,
      githubRepoUrl: githubRepo ? githubRepo.url : 'Repository generation pending'
    };

    const pdfFile = await generateAssignmentPDF(candidate);

    await transporter.sendMail({
      from: SMTP_EMAIL,
      to: email,
      subject: 'SensusSoft Technical Evaluation Assignment',
      text:`Dear ${fullName},

Please find attached your personalized technical evaluation assignment document.

Assigned Private GitHub Repository:
${candidate.githubRepoUrl}

All source code commits must be maintained on the above repository.

Regards,
SensusSoft HR Team`,
      attachments:[{ filename:`Technical_Assignment_${fullName}.pdf`, path:pdfFile }]
    });

    await writeAuditLog({
      submittedAt:new Date().toISOString(),
      fullName,email,appliedRole,yearsExperience,skills:enrichedSkills,githubRepoUrl:candidate.githubRepoUrl
    });

    return res.status(201).json({
      success:true,
      assignmentTitle:assignment.projectTitle,
      githubRepoUrl:candidate.githubRepoUrl
    });

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