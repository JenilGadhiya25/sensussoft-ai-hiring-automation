require('dotenv').config();

const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

const FALLBACK_MODELS = [
  process.env.OPENROUTER_PRIMARY_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat-v3-0324:free'
];

async function callOpenRouter(prompt) {

  let lastErr;

  for (const model of FALLBACK_MODELS) {

    try {

      const res = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method:'POST',

          headers:{
            'Authorization':'Bearer ' + process.env.OPENROUTER_API_KEY,
            'Content-Type':'application/json',
            'HTTP-Referer':'https://sensussoft.com',
            'X-Title':'SensusSoft Hiring Automation'
          },

          body:JSON.stringify({
            model,
            messages:[
              {
                role:'user',
                content:prompt
              }
            ],
            temperature:0.7,
            response_format:{ type:'json_object' }
          })
        }
      );

      if(!res.ok){

        const errText = await res.text();

        console.log(
          'MODEL FAILED =>',
          model,
          errText
        );

        lastErr = new Error(errText);
        continue;
      }

      const data = await res.json();

      console.log('OPENROUTER MODEL USED =>', model);

      return data.choices[0].message.content;

    } catch(err){

      lastErr = err;
    }
  }

  throw lastErr || new Error('All AI models failed');
}

const transporter = nodemailer.createTransport({

  service:'gmail',

  auth:{
    user:process.env.SMTP_EMAIL,
    pass:process.env.SMTP_PASS
  }
});

function buildPrompt(profile){

  const cvBlock = profile.cv_text
    ? `
Candidate Resume:
"""
${profile.cv_text}
"""
`
    : 'No CV uploaded';

  return `
You are an enterprise hiring manager at SensusSoft.

Candidate Details:

Name: ${profile.name}
Applied Role: ${profile.role}

${cvBlock}

STEP 1:
Detect role category:
- design
- development
- qa
- devops
- product

STEP 2:
Analyze CV and detect:
- technologies
- experience
- seniority
- strongest area

STEP 3:
Generate realistic personalized assignment.

RULES:

design:
- Figma task
- NO coding
- NO GitHub repository

development:
- coding project
- GitHub repository

qa:
- testing + automation

devops:
- CI/CD + deployment

product:
- PRD + documentation

IMPORTANT:
Generate professional realistic enterprise assignment documentation.

Return ONLY valid JSON:

{
  "category":"",
  "cv_summary":"",
  "detected_seniority":"",
  "title":"",
  "scenario":"",
  "requirements":[],
  "deliverables":[],
  "evaluation_criteria":[],
  "deadline_days":3
}
`;
}

async function generateTask(profile){

  const prompt = buildPrompt(profile);

  let text = await callOpenRouter(prompt);

  text = text
    .replace(/```json/g,'')
    .replace(/```/g,'')
    .trim();

  return JSON.parse(text);
}

function renderEmail(profile, task, githubRepoUrl){

  const list = arr =>
    arr.map(
      x => `<li style="margin:7px 0">${x}</li>`
    ).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:700px;color:#333">

    <h2 style="color:#1F4E79">
      SensusSoft Personalized Technical Assignment
    </h2>

    <p>
      Hello <b>${profile.name}</b>,
    </p>

    <p>
      Thank you for applying for the
      <b>${profile.role}</b> role at SensusSoft.
    </p>

    <p>
      Our AI hiring system analyzed your profile and generated the following personalized assignment.
    </p>

    <hr/>

    <h3>${task.title}</h3>

    <p>${task.scenario}</p>

    <h4>Requirements</h4>
    <ul>
      ${list(task.requirements)}
    </ul>

    <h4>Deliverables</h4>
    <ul>
      ${list(task.deliverables)}
    </ul>

    <h4>Evaluation Criteria</h4>
    <ul>
      ${list(task.evaluation_criteria)}
    </ul>

    ${
      githubRepoUrl
      ? `
      <h4>Assigned GitHub Repository</h4>

      <p>
        <a href="${githubRepoUrl}">
          ${githubRepoUrl}
        </a>
      </p>

      <p>
        IMPORTANT:
        Only ONE final push is allowed.
        Repository becomes permanently locked after first submission.
      </p>
      `
      : ''
    }

    <p>
      Deadline:
      <b>${task.deadline_days} Working Days</b>
    </p>

    <br/>

    <p>
      Regards,<br/>
      SensusSoft HR & Engineering Team
    </p>

  </div>
  `;
}

async function processCandidate(profile, githubRepoUrl){

  const task = await generateTask(profile);

  await transporter.sendMail({

    from:process.env.SMTP_EMAIL,

    to:profile.email,

    subject:`SensusSoft Assignment — ${profile.role}`,

    html:renderEmail(
      profile,
      task,
      githubRepoUrl
    )
  });

  return task;
}

module.exports = {
  processCandidate
};