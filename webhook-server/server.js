require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const normalfs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { createRepo } = require('../github-demo/githubService');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_VERCEL = !!process.env.VERCEL;

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, '..', 'audit-logs', 'candidate-log.json');
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

function enrichSkillsFromSignals(role,resumeText,skills){
  const signal = `${role} ${resumeText} ${skills.join(' ')}`.toLowerCase();
  const enriched = new Set(skills);

  if(/react|frontend|html|css|javascript|next/.test(signal)){
    enriched.add('React');
    enriched.add('Frontend Architecture');
    enriched.add('Responsive UI');
  }
  if(/node|backend|express|api|server/.test(signal)){
    enriched.add('Node.js');
    enriched.add('REST API');
    enriched.add('Database Logic');
  }
  if(/full stack|mern|developer|software engineer/.test(signal)){
    enriched.add('React');
    enriched.add('Node.js');
    enriched.add('MongoDB');
    enriched.add('Full Stack Workflow');
  }
  if(/ui|ux|figma|designer|product design/.test(signal)){
    enriched.add('Figma');
    enriched.add('Wireframing');
    enriched.add('Prototype');
    enriched.add('Design System');
  }
  if(/python|automation|django|flask/.test(signal)){
    enriched.add('Python');
    enriched.add('Automation');
    enriched.add('Reporting');
  }
  if(/qa|tester|testing/.test(signal)){
    enriched.add('Manual Testing');
    enriched.add('Automation Testing');
  }

  return [...enriched];
}

function smartFallbackAssignment(roleBucket, domain, skills){
  return {
    projectTitle:`Build a ${domain} ${roleBucket.toUpperCase()} Enterprise Solution`,
    projectIntroduction:`Develop a practical enterprise grade software solution focused on ${domain} business workflows.`,
    businessObjective:`Demonstrate architecture understanding, implementation quality, and real-world production thinking.`,
    functionalModules:[
      'Planning and Requirement Analysis',
      'Main Core Development',
      'Admin or Management Workflow',
      'Reporting and Monitoring',
      'Testing and Validation',
      'Deployment and Documentation'
    ],
    technicalRequirements:[
      `Use stack: ${skills.join(', ')}`,
      'Clean coding standards',
      'Professional architecture',
      'Deployment ready output',
      'README documentation',
      'Screenshots/demo'
    ],
    deliverables:[
      'Source code repository',
      'Live deployment',
      'Setup document',
      'Demo assets'
    ],
    evaluationCriteria:[
      'Code quality',
      'Feature completeness',
      'Business understanding',
      'Submission professionalism'
    ],
    timeline:'3 Working Days',
    recommendedStack:skills
  };
}

async function extractResumeText(file){
  try{
    let txt = '';
    txt += ' ' + (file.originalname || '');
    txt += ' ' + (file.mimetype || '');

    const cleanedName = (file.originalname || '').replace(/[_\-\.]/g,' ').replace(/pdf/gi,' ').toLowerCase();
    txt += ' ' + cleanedName;

    return txt;
  }catch{
    return '';
  }
}

async function generateAssignmentWithAI(role,resumeText,skills,fullName,yearsExperience){
  const roleBucket = detectRoleBucket(role);
  const domain = detectBusinessDomain(resumeText + ' ' + skills.join(' '));

  let seniority = 'Junior';
  if(yearsExperience >= 5) seniority = 'Senior';
  else if(yearsExperience >= 3) seniority = 'Mid Level';

  let assignment = smartFallbackAssignment(roleBucket,domain,skills);

  if(roleBucket === 'uiux'){
    assignment.projectTitle = `${seniority} UX Transformation Case Study for ${domain} Mobile App`;
    assignment.functionalModules = ['Competitor UX Benchmark','User Journey Mapping','Low Fidelity Wireframes','18+ High Fidelity Screens','Clickable Prototype','Design System Documentation'];
  }else if(roleBucket === 'frontend'){
    assignment.projectTitle = `${seniority} ${domain} Analytics Admin Dashboard Development`;
    assignment.functionalModules = ['JWT Login UI','Dashboard KPI Cards','Listing Tables','Search/Sort/Pagination','Notification Center','Responsive Mobile UI'];
  }else if(roleBucket === 'backend'){
    assignment.projectTitle = `${seniority} ${domain} Enterprise Recruitment REST API System`;
    assignment.functionalModules = ['JWT Authentication','Candidate CRUD APIs','Admin Authorization','Interview Scheduler','Report APIs','Swagger Docs'];
  }else if(roleBucket === 'fullstack'){
    assignment.projectTitle = `${seniority} Complete ${domain} SaaS Hiring Automation Platform`;
    assignment.functionalModules = ['Candidate Application Portal','Resume Upload Workflow','Secure Admin Dashboard','Assignment Generator Panel','Analytics Reports','Live Deployment'];
  }else if(roleBucket === 'python'){
    assignment.projectTitle = `${seniority} ${domain} Python Automation Reporting Utility`;
    assignment.functionalModules = ['Bulk Data Parser','Validation Engine','Summary Analytics','Export Reports','Automation Logs','Execution Utility'];
  }

  return assignment;
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
    const enrichedSkills = enrichSkillsFromSignals(appliedRole,resumeText,skills);

    const assignment = await generateAssignmentWithAI(appliedRole,resumeText,enrichedSkills,fullName,yearsExperience);

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

Please find attached your personalized technical assignment.

Assigned Private GitHub Repository:
${candidate.githubRepoUrl}

You are required to push all project commits only on this repository.

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