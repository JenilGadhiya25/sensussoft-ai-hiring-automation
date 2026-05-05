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
app.use(express.urlencoded({ extended:true }));
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

/* KEEP ALL YOUR EXISTING FUNCTIONS HERE:
detectRoleBucket
enrichSkillsFromSignals
generateAssignment
extractResumeText
writeAuditLog
generateAssignmentPDF
(aa badha same rehse je apde banavya)
*/


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

Congratulations.

Based on initial HR technical screening, your profile has been shortlisted for the next technical evaluation round.

Please find attached your personalized technical assignment document.

Assigned Private GitHub Repository:
${candidate.githubRepoUrl}

Important:
- All source code must be pushed only on the assigned repository
- Final submission timeline is ${candidate.assignment.timeline}

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


/* NEW GITHUB WEBHOOK ROUTE */
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));
app.post('/api/github-submission-webhook', githubWebhookHandler);

app.get('/',(_,res)=>res.send('SensusSoft Enterprise AI Hiring Backend Running'));

module.exports = app;

if(!process.env.VERCEL){
  app.listen(PORT,()=>console.log(`Server running on http://localhost:${PORT}`));
}