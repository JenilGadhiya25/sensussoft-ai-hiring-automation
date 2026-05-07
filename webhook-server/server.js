require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const normalfs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const { createRepo } = require('../github-demo/githubService');
const githubWebhookHandler = require('./githubWebhookHandler');

const app = express();
const PORT = process.env.PORT || 4000;

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join('/tmp', 'candidate-log.json');
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

const ROLE_CATEGORIES = {
  software: [
    'developer','engineer','software','frontend','backend','full stack',
    'mern','react','node','python','php','java','flutter','devops',
    'qa','tester','technical','programmer','web','api','database'
  ],

  design: [
    'designer','ui','ux','figma','graphics','visual design',
    'product design','adobe xd','photoshop','illustrator'
  ],

  finance: [
    'accountant','finance','banking','tax','gst','auditor'
  ],

  food: [
    'chef','cook','food','kitchen','restaurant','bakery'
  ],

  marketing: [
    'marketing','seo','social media','branding','sales'
  ]
};

app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));

app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');

  if(req.method === 'OPTIONS'){
    return res.sendStatus(200);
  }

  next();
});

const upload = multer({ dest:'/tmp' });

const transporter = nodemailer.createTransport({
  service:'gmail',
  auth:{
    user:SMTP_EMAIL,
    pass:SMTP_PASS
  }
});

function detectCategory(text){
  const lower = String(text || '').toLowerCase();

  for(const [category, keywords] of Object.entries(ROLE_CATEGORIES)){
    if(keywords.some(word => lower.includes(word))){
      return category;
    }
  }

  return 'unknown';
}

async function generateAIAssignment(appliedRole, skills, yearsExperience){
  try{

    const prompt = `
You are an enterprise technical hiring manager.

Generate a UNIQUE personalized software development technical assignment for a candidate.

Candidate Role: ${appliedRole}
Candidate Skills: ${skills.join(', ')}
Candidate Experience: ${yearsExperience} years

Requirements:
1. Generate a realistic enterprise-level project title.
2. Generate 10 detailed functional modules.
3. Generate recommended technology stack.
4. Generate 5 evaluation criteria.
5. Timeline should be 3 Working Days.
6. Assignment should be different, professional and implementation heavy.
7. Return ONLY valid JSON in this format:

{
 "projectTitle":"",
 "functionalModules":[],
 "recommendedStack":[],
 "evaluationCriteria":[],
 "timeline":"3 Working Days"
}
`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model:'anthropic/claude-3.5-sonnet',
        messages:[
          {
            role:'user',
            content:prompt
          }
        ],
        temperature:0.9
      })
    });

    const data = await response.json();

    const raw = data.choices?.[0]?.message?.content || '';

    const clean = raw
      .replace(/```json/g,'')
      .replace(/```/g,'')
      .trim();

    return JSON.parse(clean);

  }catch(err){

    console.log('AI Assignment Fallback =>', err.message);

    return {
      projectTitle:'Enterprise Full Stack Recruitment Management SaaS Platform',

      functionalModules:[
        'Secure Admin Authentication System',
        'Candidate Application Form With Resume Upload',
        'Candidate Tracking Dashboard',
        'Assignment Generation Panel',
        'Technical Review Management',
        'Search Filter Pagination Data Tables',
        'Analytics KPI Reporting',
        'Email Notification Workflow',
        'Responsive Mobile Interface',
        'Deployment With Production Documentation'
      ],

      recommendedStack:[
        'React',
        'Node.js',
        'Express',
        'MongoDB',
        'JWT',
        'CSS',
        'REST API'
      ],

      evaluationCriteria:[
        'Project Architecture',
        'Code Quality',
        'UI/UX Responsiveness',
        'Deployment Completeness',
        'Documentation Quality'
      ],

      timeline:'3 Working Days'
    };
  }
}

async function extractResumeText(file){
  try{

    if(!file){
      return '';
    }

    return `
      Resume uploaded:
      ${file.originalname || 'candidate_resume.pdf'}
    `;

  }catch(err){
    return '';
  }
}

async function writeAuditLog(entry){

  try{

    let logs = [];

    if(normalfs.existsSync(AUDIT_LOG_PATH)){

      try{
        logs = JSON.parse(
          await fs.readFile(AUDIT_LOG_PATH,'utf8')
        );
      }catch(e){
        logs = [];
      }
    }

    logs.push(entry);

    await fs.writeFile(
      AUDIT_LOG_PATH,
      JSON.stringify(logs,null,2)
    );

  }catch(err){

    console.log('Audit log failed =>', err.message);
  }
}

async function generateAssignmentPDF(candidate){

  return new Promise((resolve,reject)=>{

    try{

      const pdfPath = path.join(
        '/tmp',
        `assignment-${Date.now()}.pdf`
      );

      const doc = new PDFDocument({ margin:40 });

      const stream = normalfs.createWriteStream(pdfPath);

      doc.pipe(stream);

      doc.fontSize(18).text(
        'SensusSoft Technologies Pvt. Ltd.',
        { align:'center' }
      );

      doc.fontSize(15).text(
        'Personalized Technical Assignment Documentation',
        { align:'center' }
      );

      doc.moveDown();

      doc.fontSize(12).text(`Candidate Name: ${candidate.fullName}`);
      doc.text(`Applied Role: ${candidate.appliedRole}`);
      doc.text(`Experience: ${candidate.yearsExperience} Years`);
      doc.text(`Screening Score: ${candidate.hrScore}/100`);
      doc.text(`Submission Deadline: ${candidate.assignment.timeline}`);
      doc.text(`GitHub Repository: ${candidate.githubRepoUrl}`);

      doc.moveDown();

      doc.fontSize(14).text('1. Assigned Enterprise Project');

      doc.fontSize(12).text(
        candidate.assignment.projectTitle
      );

      doc.moveDown();

      doc.fontSize(14).text(
        '2. Functional Development Modules'
      );

      candidate.assignment.functionalModules.forEach((m,i)=>{
        doc.text(`${i+1}. ${m}`);
      });

      doc.moveDown();

      doc.fontSize(14).text(
        '3. Recommended Technology Stack'
      );

      candidate.assignment.recommendedStack.forEach((s,i)=>{
        doc.text(`${i+1}. ${s}`);
      });

      doc.moveDown();

      doc.fontSize(14).text(
        '4. Evaluation Criteria'
      );

      candidate.assignment.evaluationCriteria.forEach((e,i)=>{
        doc.text(`${i+1}. ${e}`);
      });

      doc.moveDown();

      doc.fontSize(14).text(
        '5. Mandatory Submission Workflow'
      );

      doc.text('1. Clone assigned GitHub repository');
      doc.text('2. Complete project locally');
      doc.text('3. Push only one final submission');
      doc.text('4. Repository will lock after first push');
      doc.text('5. Include README and deployment proof');

      doc.moveDown();

      doc.text('Regards,');
      doc.text('SensusSoft HR & Engineering Recruitment Team');

      doc.end();

      stream.on('finish',()=>resolve(pdfPath));
      stream.on('error',reject);

    }catch(err){

      reject(err);
    }
  });
}

async function safeSendMail(options){

  try{

    return await Promise.race([

      transporter.sendMail(options),

      new Promise((_,reject)=>
        setTimeout(
          ()=>reject(new Error('Mail timeout')),
          10000
        )
      )
    ]);

  }catch(err){

    console.log('MAIL SEND FAILED =>', err.message);

    return null;
  }
}

app.post(
  '/api/career-apply',
  upload.single('resumeFile'),

  async (req,res)=>{

    try{

      const body = req.body || {};

      const fullName = String(body.fullName || '').trim();

      const email = String(body.email || '').trim();

      const appliedRole = String(body.appliedRole || '').trim();

      const yearsExperience = Number(
        body.yearsExperience || 0
      );

      const skills = String(body.skills || '')
        .split(',')
        .map(s=>s.trim())
        .filter(Boolean);

      if(!fullName || !email || !appliedRole){

        return res.status(400).json({
          error:'Missing required fields'
        });
      }

      const roleIsTech = TECH_ROLE_KEYWORDS.some(word =>
        appliedRole.toLowerCase().includes(word)
      );

      const skillsAreTech = skills.some(skill =>
        TECH_SKILL_KEYWORDS.some(word =>
          skill.toLowerCase().includes(word)
        )
      );

      if(!roleIsTech && !skillsAreTech){

        return res.status(400).json({
          error:'Currently we are accepting applications only for IT and Software related positions.'
        });
      }

      const resumeText = req.file
        ? await extractResumeText(req.file)
        : '';

      const roleCategory = detectCategory(appliedRole);

      const combinedResumeData = `
        ${resumeText}
        ${skills.join(' ')}
      `;

      const resumeCategory = detectCategory(
        combinedResumeData
      );

      if(
        roleCategory !== 'unknown' &&
        resumeCategory !== 'unknown' &&
        roleCategory !== resumeCategory
      ){

        return res.status(400).json({
          error:`Your resume background does not match the selected role (${appliedRole}). Please apply for a role relevant to your experience and skills.`
        });
      }

      const enrichedSkills = [
        ...new Set([
          ...skills,
          resumeText
        ].filter(Boolean))
      ];

      const assignment = await generateAIAssignment(
        appliedRole,
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

        console.log(
          'GitHub Repo Create Failed =>',
          err.message
        );
      }

      const candidate = {
        fullName,
        email,
        appliedRole,
        yearsExperience,

        skills: assignment.recommendedStack,

        hrScore: Math.min(
          98,
          75 + (yearsExperience * 3) + (enrichedSkills.length * 2)
        ),

        assignment,

        githubRepoUrl: githubRepo
          ? githubRepo.url
          : 'Repository generation pending'
      };

      await new Promise(resolve=>
        setTimeout(resolve,2000)
      );

      const pdfFile = await generateAssignmentPDF(candidate);

      await safeSendMail({

        from: SMTP_EMAIL,

        to: email,

        subject:'SensusSoft Personalized Technical Evaluation Assignment',

        text:`
Dear ${fullName},

Your personalized technical assignment has been generated successfully.

Assigned GitHub Repository:
${candidate.githubRepoUrl}

Please complete the assignment and push only ONE final submission.

IMPORTANT:
After first push the repository will be locked permanently.

Regards,
SensusSoft HR Team
`,

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

        githubRepoUrl:candidate.githubRepoUrl,

        assignmentTitle:assignment.projectTitle
      });

      return res.status(201).json({

        success:true,

        assignmentTitle:assignment.projectTitle,

        githubRepoUrl:candidate.githubRepoUrl
      });

    }catch(err){

      console.error('SERVER ERROR =>', err);

      return res.status(500).json({
        error:'A server error occurred while processing candidate application.'
      });
    }
  }
);

app.post(
  '/api/github-submission-webhook',
  githubWebhookHandler
);

app.get('/',(_,res)=>
  res.send(
    'SensusSoft Enterprise AI Hiring Backend Running'
  )
);

module.exports = app;

if(!process.env.VERCEL){

  app.listen(PORT,()=>{

    console.log(
      `Server running on http://localhost:${PORT}`
    );
  });
}