require('dotenv').config();

const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs').promises;

const { createRepo } = require('../github-demo/githubService');
const githubWebhookHandler = require('./githubWebhookHandler');
const { processCandidate } = require('./brain');

const app = express();
const PORT = process.env.PORT || 4000;

const AUDIT_LOG_PATH =
  process.env.AUDIT_LOG_PATH ||
  path.join('/tmp', 'candidate-log.json');

app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));

app.use((req,res,next)=>{

  res.setHeader('Access-Control-Allow-Origin','*');

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  if(req.method === 'OPTIONS'){
    return res.sendStatus(200);
  }

  next();
});

const upload = multer({

  storage: multer.memoryStorage(),

  limits:{
    fileSize:5 * 1024 * 1024
  }
});

async function extractCvText(file){

  if(!file){
    return '';
  }

  try{

    if(
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ){

      const data = await pdfParse(file.buffer);

      return (data.text || '').trim();
    }

    if(
      file.originalname.toLowerCase().endsWith('.docx')
    ){

      const result =
        await mammoth.extractRawText({
          buffer:file.buffer
        });

      return (result.value || '').trim();
    }

    return '';

  }catch(err){

    console.log(
      'CV EXTRACTION ERROR =>',
      err.message
    );

    return '';
  }
}

async function writeAuditLog(entry){

  try{

    let logs = [];

    try{

      const old =
        await fs.readFile(
          AUDIT_LOG_PATH,
          'utf8'
        );

      logs = JSON.parse(old);

    }catch(e){
      logs = [];
    }

    logs.push(entry);

    await fs.writeFile(
      AUDIT_LOG_PATH,
      JSON.stringify(logs,null,2)
    );

  }catch(err){

    console.log(
      'AUDIT LOG ERROR =>',
      err.message
    );
  }
}

function needsGithubRepo(role){

  const lower = String(role || '').toLowerCase();

  return (

    lower.includes('developer') ||
    lower.includes('engineer') ||
    lower.includes('frontend') ||
    lower.includes('backend') ||
    lower.includes('full stack') ||
    lower.includes('mern') ||
    lower.includes('qa') ||
    lower.includes('tester') ||
    lower.includes('devops')

  );
}

app.post(
  '/api/career-apply',

  upload.single('resumeFile'),

  async (req,res)=>{

    try{

      const body = req.body || {};

      const fullName =
        String(body.fullName || '').trim();

      const email =
        String(body.email || '').trim();

      const appliedRole =
        String(body.appliedRole || '').trim();

      if(
        !fullName ||
        !email ||
        !appliedRole
      ){

        return res.status(400).json({
          error:'Missing required fields'
        });
      }

      console.log(
        '[APPLICATION]',
        fullName,
        appliedRole
      );

      const cvText =
        await extractCvText(req.file);

      const profile = {

        name: fullName,

        email,

        role: appliedRole,

        cv_text: cvText.slice(0,8000)
      };

      let githubRepoUrl = null;

      if(needsGithubRepo(appliedRole)){

        try{

          const repo = await createRepo({

            fullName,

            role: appliedRole,

            assignmentTitle:'AI Technical Assignment',

            assignmentRequirements:[]
          });

          githubRepoUrl = repo.url;

          console.log(
            'GITHUB REPO CREATED =>',
            githubRepoUrl
          );

        }catch(err){

          console.log(
            'GITHUB REPO ERROR =>',
            err.message
          );
        }
      }

      const task =
        await processCandidate(
          profile,
          githubRepoUrl
        );

      await writeAuditLog({

        submittedAt:
          new Date().toISOString(),

        fullName,

        email,

        appliedRole,

        githubRepoUrl,

        taskTitle: task.title,

        category: task.category,

        seniority:
          task.detected_seniority
      });

      return res.status(201).json({

        success:true,

        taskTitle: task.title,

        category: task.category,

        seniority:
          task.detected_seniority,

        githubRepoUrl
      });

    }catch(err){

      console.error(
        'SERVER ERROR =>',
        err
      );

      return res.status(500).json({

        error:
          'Failed to process application'
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
    'SensusSoft AI Hiring Automation Running'
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