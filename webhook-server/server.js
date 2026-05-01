require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const normalfs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');
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
  auth:{
    user:SMTP_EMAIL,
    pass:SMTP_PASS
  }
});

function detectRoleBucket(role=''){
  const r = role.toLowerCase();

  if(/ui|ux|product designer|web designer|figma|graphic/.test(r)) return 'uiux';
  if(/frontend|react|angular|vue|html|css|javascript ui/.test(r)) return 'frontend';
  if(/backend|node|express|api developer|server/.test(r)) return 'backend';
  if(/full stack|mern|mean|software engineer|web developer/.test(r)) return 'fullstack';
  if(/python|flask|django|automation|data/.test(r)) return 'python';
  if(/qa|tester|testing/.test(r)) return 'qa';
  if(/devops|cloud|aws|deployment|ci\/cd/.test(r)) return 'devops';
  return 'general';
}

function detectBusinessDomain(resume=''){
  const t = resume.toLowerCase();

  if(/healthcare|doctor|patient|clinic|hospital|medical/.test(t)) return 'healthcare';
  if(/ecommerce|shopping|cart|product order/.test(t)) return 'ecommerce';
  if(/food|restaurant|delivery|zomato|swiggy/.test(t)) return 'food';
  if(/crm|lead management|sales/.test(t)) return 'crm';
  if(/fintech|bank|wallet|payment/.test(t)) return 'fintech';
  if(/travel|hotel|booking|tour/.test(t)) return 'travel';
  if(/school|student|education|learning/.test(t)) return 'education';
  if(/inventory|stock management|warehouse/.test(t)) return 'inventory';
  if(/social media|chat|community/.test(t)) return 'social';
  if(/dashboard|analytics|report/.test(t)) return 'analytics';
  return 'business';
}

function smartFallbackAssignment(roleBucket, domain, skills){
  const map = {
    uiux: {
      projectTitle:`Design a Complete ${domain} Mobile Experience`,
      projectIntroduction:`Create an enterprise-grade Figma based UX case study for a ${domain} mobile and web platform.`,
      businessObjective:`Build an intuitive and modern user experience that solves real customer journey problems in the ${domain} industry.`,
      functionalModules:[
        'User Persona Research & Competitor Benchmarking',
        'Low Fidelity Wireframe Planning',
        'High Fidelity Figma Screen Design',
        'Interactive Clickable Prototype',
        'Design System & Component Library',
        'Usability Improvement Notes'
      ],
      technicalRequirements:[
        'Minimum 15 designed screens',
        'Complete design system tokens',
        'User flow diagrams',
        'Responsive desktop + mobile view',
        'Prototype interactions',
        'Case study explanation PDF'
      ]
    },

    frontend: {
      projectTitle:`Build a Responsive ${domain} Analytics Dashboard`,
      projectIntroduction:`Develop a frontend production-ready web dashboard with rich UI, charts, and responsive workflows.`,
      businessObjective:`Allow end users to manage and monitor all ${domain} related activities using an elegant frontend interface.`,
      functionalModules:[
        'Login & Authentication Screens',
        'Dashboard KPI Cards and Graphs',
        'Listing Table with Search Filter Pagination',
        'Profile and Settings Module',
        'Notification and Status UI',
        'Responsive Mobile Adaptation'
      ],
      technicalRequirements:[
        'React production components',
        'Reusable hooks and state management',
        'API integration with dummy/mock backend',
        'Charts and tables',
        'Clean CSS/UI architecture',
        'Deployment on Vercel/Netlify'
      ]
    },

    backend: {
      projectTitle:`Develop a ${domain} REST API Management System`,
      projectIntroduction:`Build a scalable backend server architecture to handle enterprise ${domain} workflows.`,
      businessObjective:`Provide secure APIs, reporting endpoints, and business logic automation for the company.`,
      functionalModules:[
        'JWT Authentication APIs',
        'Master CRUD Resource APIs',
        'Admin Reporting APIs',
        'Status Update Workflow',
        'Validation Middleware',
        'Swagger/Postman Documentation'
      ],
      technicalRequirements:[
        'Node + Express server',
        'MongoDB/MySQL schema',
        'Production middleware',
        'Error handling',
        'Postman collection',
        'Deployable backend'
      ]
    },

    fullstack: {
      projectTitle:`Build a Complete ${domain} SaaS Management Platform`,
      projectIntroduction:`Develop a real-world enterprise software with frontend, backend, admin, and reporting.`,
      businessObjective:`Digitize and automate the full business process of a ${domain} company using a scalable software platform.`,
      functionalModules:[
        'Candidate/User Side Application',
        'Admin Management Dashboard',
        'Secure Backend APIs',
        'Database & Status Workflow',
        'Reports and Analytics',
        'Deployment and Documentation'
      ],
      technicalRequirements:[
        'React frontend',
        'Node backend',
        'MongoDB integration',
        'Authentication',
        'Role management',
        'Live deployment'
      ]
    },

    python: {
      projectTitle:`Create a ${domain} Data Automation Utility`,
      projectIntroduction:`Develop a Python automation solution to process, analyze, and generate reports.`,
      businessObjective:`Reduce manual effort and improve data decision making in ${domain} operations.`,
      functionalModules:[
        'Input Data Parsing',
        'Cleaning and Validation',
        'Analytics Engine',
        'Summary Report Generation',
        'Graph Visualization',
        'Export Utility'
      ],
      technicalRequirements:[
        'Python scripts',
        'Pandas processing',
        'Auto report export',
        'CLI or Flask wrapper',
        'Error logs',
        'Documentation'
      ]
    },

    qa: {
      projectTitle:`Build a Testing Framework for ${domain} Application`,
      projectIntroduction:`Create a full QA automation suite to test a software application in ${domain}.`,
      businessObjective:`Ensure enterprise quality assurance and bug free release cycle.`,
      functionalModules:[
        'Manual Test Cases',
        'Automation UI Scripts',
        'API Testing',
        'Bug Logging',
        'Regression Pack',
        'Coverage Report'
      ],
      technicalRequirements:[
        'Cypress/Selenium',
        'Postman tests',
        'Bug sheet',
        'Reports',
        'CI execution',
        'Documentation'
      ]
    },

    devops: {
      projectTitle:`Create CI/CD Pipeline for ${domain} Cloud Platform`,
      projectIntroduction:`Automate build, testing, deployment and monitoring workflow for software delivery.`,
      businessObjective:`Reduce release time and improve deployment reliability.`,
      functionalModules:[
        'Git Integration',
        'Build Automation',
        'Testing Pipeline',
        'Docker Containerization',
        'Cloud Deployment',
        'Monitoring Alerts'
      ],
      technicalRequirements:[
        'GitHub Actions/Jenkins',
        'Docker',
        'Cloud hosting',
        'Rollback config',
        'Logs',
        'DevOps documentation'
      ]
    },

    general: {
      projectTitle:`Custom ${domain} Technical Engineering Project`,
      projectIntroduction:`Build a practical technical software solution relevant to your role.`,
      businessObjective:`Demonstrate architecture, coding, and deployment capabilities.`,
      functionalModules:[
        'Planning',
        'Development',
        'Testing',
        'Documentation',
        'Deployment',
        'Reporting'
      ],
      technicalRequirements:[
        'Relevant stack',
        'Professional coding',
        'Version control',
        'Testing',
        'README',
        'Live demo'
      ]
    }
  };

  const base = map[roleBucket];
  return {
    projectTitle: base.projectTitle,
    projectIntroduction: base.projectIntroduction,
    businessObjective: base.businessObjective,
    functionalModules: base.functionalModules,
    technicalRequirements: base.technicalRequirements,
    deliverables:[
      'Complete source code repository',
      'README setup guide',
      'Demo screenshots/video',
      'Final submission documentation'
    ],
    evaluationCriteria:[
      'Architecture & code quality',
      'Business understanding',
      'UI/UX or API completeness',
      'Documentation & deployment'
    ],
    timeline:'Complete within 3 working days',
    recommendedStack: skills.length ? skills : ['Technology as per candidate profile']
  };
}

function cleanAIJson(text){
  try{
    let cleaned = text.replace(/```json|```/g,'').trim();
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if(first !== -1 && last !== -1){
      cleaned = cleaned.substring(first,last+1);
    }
    cleaned = cleaned.replace(/,\s*}/g,'}').replace(/,\s*]/g,']');
    return JSON.parse(cleaned);
  }catch{
    return null;
  }
}

async function generateAssignmentWithAI(role, resumeText, skills){
  const roleBucket = detectRoleBucket(role);
  const domain = detectBusinessDomain(resumeText);

  const prompt = `
Generate a VERY DETAILED enterprise software company technical assignment.

Candidate Role Bucket: ${roleBucket}
Business Domain: ${domain}
Candidate Skills: ${skills.join(', ')}
Resume Context: ${resumeText.slice(0,2000)}

Need LONG realistic company assignment document.
Must not be generic.
Must be role specific.
Must be domain specific.

Return ONLY JSON:
{
"projectTitle":"",
"projectIntroduction":"",
"businessObjective":"",
"functionalModules":["","","","","",""],
"technicalRequirements":["","","","","",""],
"deliverables":["","","",""],
"evaluationCriteria":["","","",""],
"timeline":"",
"recommendedStack":["","",""]
}
`;

  try{
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:'google/gemma-3-27b-it:free',
        messages:[
          {role:'system',content:'You are an enterprise HR technical assignment generator.'},
          {role:'user',content:prompt}
        ],
        temperature:1.4,
        max_tokens:1500
      })
    });

    const data = await response.json();
    console.log('OPENROUTER =>', JSON.stringify(data));

    const aiText = data?.choices?.[0]?.message?.content || '';
    const parsed = cleanAIJson(aiText);

    if(parsed) return parsed;

    return smartFallbackAssignment(roleBucket, domain, skills);

  }catch(err){
    console.log('AI FAILED =>', err.message);
    return smartFallbackAssignment(roleBucket, domain, skills);
  }
}
async function extractResumeText(filePath){
  try{
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return (pdfData.text || '').replace(/\s+/g,' ').trim();
  }catch(err){
    console.log('Resume parse failed =>', err.message);
    return '';
  }
}

async function writeAuditLog(entry){
  try{
    const dir = path.dirname(AUDIT_LOG_PATH);
    if(!normalfs.existsSync(dir)){
      normalfs.mkdirSync(dir,{recursive:true});
    }

    let arr = [];
    if(normalfs.existsSync(AUDIT_LOG_PATH)){
      arr = JSON.parse(await fs.readFile(AUDIT_LOG_PATH,'utf8'));
      if(!Array.isArray(arr)) arr = [];
    }

    arr.push(entry);
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(arr,null,2));
  }catch(err){
    console.log('Audit log failed =>', err.message);
  }
}

async function generateAssignmentPDF(candidate){
  const pdfPath = IS_VERCEL
    ? `/tmp/assignment-${Date.now()}.pdf`
    : path.join(__dirname, `assignment-${Date.now()}.pdf`);

  return new Promise((resolve)=>{
    const doc = new PDFDocument({ margin:50 });
    const stream = normalfs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(22).text('SensusSoft Technologies Pvt. Ltd.', { align:'center' });
    doc.fontSize(15).text('Candidate Technical Evaluation Assignment Document', { align:'center' });
    doc.moveDown(2);

    doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
    doc.text(`Applied Role: ${candidate.appliedRole}`);
    doc.text(`HR Screening Score: ${candidate.hrScore}/100`);
    doc.text(`Submission Deadline: ${candidate.assignment.timeline}`);
    doc.moveDown();

    doc.fontSize(16).text(`1. Project Title`);
    doc.fontSize(12).text(candidate.assignment.projectTitle);
    doc.moveDown();

    doc.fontSize(16).text(`2. Project Introduction`);
    doc.fontSize(12).text(candidate.assignment.projectIntroduction);
    doc.moveDown();

    doc.fontSize(16).text(`3. Business Objective`);
    doc.fontSize(12).text(candidate.assignment.businessObjective);
    doc.moveDown();

    doc.fontSize(16).text(`4. Functional Module Breakdown`);
    candidate.assignment.functionalModules.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.fontSize(16).text(`5. Technical Development Requirements`);
    candidate.assignment.technicalRequirements.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.addPage();

    doc.fontSize(16).text(`6. Required Deliverables`);
    candidate.assignment.deliverables.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.fontSize(16).text(`7. Evaluation Criteria`);
    candidate.assignment.evaluationCriteria.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.fontSize(16).text(`8. Recommended Technology Stack`);
    candidate.assignment.recommendedStack.forEach((m,i)=>{
      doc.fontSize(12).text(`${i+1}. ${m}`);
    });
    doc.moveDown();

    doc.fontSize(16).text(`9. Final HR Submission Notes`);
    doc.fontSize(12).text('Candidate must submit complete source code, deployment link, documentation, and setup instructions. All deliverables will be reviewed by the technical panel based on architecture quality, implementation depth, professional coding standards, business understanding, and production readiness.');
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
      return res.status(400).json({ error:'Missing required fields.' });
    }

    const resumeText = req.file ? await extractResumeText(req.file.path) : '';

    const aiAssignment = await generateAssignmentWithAI(appliedRole, resumeText, skills);

    const processedCandidate = {
      fullName,
      email,
      appliedRole,
      yearsExperience,
      skills,
      hrScore: Math.min(98, 72 + (yearsExperience*4) + (skills.length*2)),
      assignment: aiAssignment
    };

    const pdfFile = await generateAssignmentPDF(processedCandidate);

    await transporter.sendMail({
      from: SMTP_EMAIL,
      to: email,
      subject: 'SensusSoft Technical Evaluation Assignment',
      text:`Dear ${fullName},

Thank you for applying for ${appliedRole} at SensusSoft Technologies.

Please find attached your personalized technical assignment document for the next evaluation round.

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
      skills,
      assignmentTitle: aiAssignment.projectTitle
    });

    return res.status(201).json({
      success:true,
      assignmentTitle: aiAssignment.projectTitle
    });

  }catch(err){
    console.error('SERVER ERROR =>', err);
    return res.status(500).json({ error:'A server error occurred while processing candidate application.' });
  }
});

app.get('/',(_,res)=>{
  res.send('SensusSoft Enterprise AI Hiring Backend Running');
});

module.exports = app;

if(!process.env.VERCEL){
  app.listen(PORT, ()=>{
    console.log(`Server running on http://localhost:${PORT}`);
  });
}