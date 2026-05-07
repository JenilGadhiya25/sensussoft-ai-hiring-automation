require('dotenv').config();

const express = require('express');
const multer = require('multer');

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

app.use(express.json({
  limit:'10mb'
}));

app.use(express.urlencoded({
  extended:true
}));

app.use((req,res,next)=>{

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

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

  const lower =
    String(role || '')
      .toLowerCase();

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

      console.log(
        'CAREER APPLY API HIT'
      );

      const body = req.body || {};

      const fullName =
        String(
          body.fullName || ''
        ).trim();

      const email =
        String(
          body.email || ''
        ).trim();

      const appliedRole =
        String(
          body.appliedRole || ''
        ).trim();

      const skills =
        String(
          body.skills || ''
        ).trim();

      if(
        !fullName ||
        !email ||
        !appliedRole
      ){

        return res.status(400).json({
          error:'Missing required fields'
        });
      }

     const profile = {

  name: fullName,

  email,

  role: appliedRole,

  cv_text: skills || ''
};

      let githubRepoUrl = null;

      if(
        needsGithubRepo(
          appliedRole
        )
      ){

        try{

          const repo =
            await createRepo({

              fullName,

              role: appliedRole,

              assignmentTitle:
                'AI Technical Assignment',

              assignmentRequirements:[]
            });

          githubRepoUrl =
            repo.url;

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

        taskTitle:
          task.title,

        category:
          task.category,

        seniority:
          task.detected_seniority
      });

      return res.status(201).json({

        success:true,

        taskTitle:
          task.title,

        category:
          task.category,

        seniority:
          task.detected_seniority,

        githubRepoUrl
      });

    }catch(err){

      console.log(
        'SERVER ERROR =>',
        err.message
      );

      return res.status(500).json({

        error:
          err.message || 'Internal server error'
      });
    }
  }
);

app.post(
  '/api/github-submission-webhook',
  githubWebhookHandler
);

app.get('/',(_,res)=>{

  res.send(
    'SensusSoft AI Hiring Automation Running'
  );
});

module.exports = app;

if(!process.env.VERCEL){

  app.listen(PORT,()=>{

    console.log(
      `Server running on http://localhost:${PORT}`
    );
  });
}