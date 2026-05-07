require('dotenv').config();

const nodemailer = require('nodemailer');

global.fetch = (...args) =>
  import('node-fetch').then(
    ({ default: fetch }) => fetch(...args)
  );

const FALLBACK_MODELS = [
  'openai/gpt-3.5-turbo'
];
async function callOpenRouter(prompt) {

  let lastErr;

  for (const model of FALLBACK_MODELS) {

    try {

      console.log('TRYING MODEL =>', model);

      const res = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            'Authorization':
              'Bearer ' + process.env.OPENROUTER_API_KEY,

            'Content-Type': 'application/json',

            'HTTP-Referer': 'https://sensussoft.com',

            'X-Title':
              'SensusSoft Hiring Automation'
          },

          body: JSON.stringify({

            model,

            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],

            temperature: 0.5
          })
        }
      );

      if (!res.ok) {

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

      console.log(
        'OPENROUTER MODEL USED =>',
        model
      );

      return data?.choices?.[0]?.message?.content || '';

    } catch (err) {

      console.log(
        'MODEL ERROR =>',
        model,
        err.message
      );

      lastErr = err;
    }
  }

  throw lastErr || new Error('All AI models failed');
}

const transporter = nodemailer.createTransport({

  service: 'gmail',

  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});

function buildPrompt(profile) {

  const cvBlock = profile.cv_text
    ? `
Candidate Resume / Skills:
"""
${profile.cv_text}
"""
`
    : 'No CV uploaded';

  return `

You are a senior enterprise hiring manager at SensusSoft.

Candidate Details:

Name: ${profile.name}

Applied Role: ${profile.role}

${cvBlock}

STEP 0:

Carefully verify whether the selected role realistically matches the candidate background.

IMPORTANT VALIDATION RULES:

ACCEPT these as DEVELOPMENT background:
- React
- Node.js
- Next.js
- JavaScript
- TypeScript
- MongoDB
- Firebase
- Express
- Backend
- Frontend
- Full Stack
- MERN
- APIs
- Web Development

ACCEPT these as DESIGN background:
- UI/UX
- Figma
- Adobe XD
- Wireframes
- Prototypes
- Graphic Design

ONLY mark ROLE_MISMATCH when the candidate background is COMPLETELY different.

Examples of VALID matches:
- React Developer + Full Stack resume = VALID
- Frontend Developer + MERN Stack resume = VALID
- Node.js Developer + Backend resume = VALID

Examples of REAL mismatches:
- UI/UX Designer + Backend Developer resume = ROLE_MISMATCH
- React Developer + Graphic Designer resume = ROLE_MISMATCH
- QA Engineer + Only UI/UX portfolio = ROLE_MISMATCH

If there is partial overlap with developer technologies,
DO NOT mark mismatch.

If mismatch detected:

Return ONLY this JSON:

{
  "role_mismatch": true,
  "message": "The selected role does not match the candidate technical background and experience."
}

DO NOT generate assignment.

-----------------------------------

STEP 1:

Detect role category:

- design
- development
- qa
- devops
- product

-----------------------------------

STEP 2:

Analyze candidate profile:

- technologies
- real skills
- experience level
- strongest area
- suitable task difficulty

-----------------------------------

STEP 3:

Generate REALISTIC enterprise-level personalized assignment.

IMPORTANT RULES:

DESIGN:
- Figma
- Wireframes
- Design system
- UX research
- NO coding

DEVELOPMENT:
- GitHub repository
- Real coding task
- APIs
- Authentication
- Database
- Deployment

QA:
- Automation testing
- Test cases
- Cypress/Postman

DEVOPS:
- CI/CD
- Docker
- AWS/Vercel
- Deployment pipeline

PRODUCT:
- PRD
- User stories
- Roadmap

-----------------------------------

VERY IMPORTANT:

Generate:
- long professional documentation
- enterprise-level realistic assignment
- proper requirements
- proper deliverables
- realistic evaluation criteria

DO NOT generate generic tasks.

DO NOT return markdown.

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

async function generateTask(profile) {

  const prompt = buildPrompt(profile);

  let text = await callOpenRouter(prompt);

  text = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  console.log(
    'RAW AI RESPONSE =>',
    text
  );

  try {

    const parsed = JSON.parse(text);

    return parsed;

  } catch (err) {

    console.log(
      'JSON PARSE FAILED =>',
      err.message
    );

    console.log(
      'INVALID AI RESPONSE =>',
      text
    );

    throw new Error(
      'AI returned invalid JSON response'
    );
  }
}

function renderList(arr) {

  return (arr || [])
    .map(
      item =>
        `<li style="margin:8px 0">${item}</li>`
    )
    .join('');
}

function renderMismatchEmail(task) {

  return `

  <div style="font-family:Arial;padding:20px;color:#333">

    <h2 style="color:#d32f2f">
      Role Mismatch Detected
    </h2>

    <p>
      ${task.message}
    </p>

    <p>
      Please apply for a role that matches
      your actual technical background,
      skills and experience.
    </p>

    <br/>

    <p>
      Regards,<br/>
      SensusSoft HR Team
    </p>

  </div>
  `;
}

function renderAssignmentEmail(
  profile,
  task,
  githubRepoUrl
) {

  return `

  <div style="font-family:Arial,sans-serif;max-width:760px;color:#333">

    <h1 style="color:#1F4E79">
      SensusSoft Personalized Technical Assignment
    </h1>

    <p>
      Hello <b>${profile.name}</b>,
    </p>

    <p>
      Thank you for applying for the
      <b>${profile.role}</b> role at SensusSoft.
    </p>

    <p>
      Our AI hiring automation system analyzed
      your profile, skills and experience
      and generated the following personalized assignment.
    </p>

    <hr/>

    <h2 style="color:#1F4E79">
      ${task.title}
    </h2>

    <p>
      ${task.scenario}
    </p>

    <h3>Profile Analysis Summary</h3>

    <p>
      ${task.cv_summary}
    </p>

    <h3>Assignment Requirements</h3>

    <ul>
      ${renderList(task.requirements)}
    </ul>

    <h3>Expected Deliverables</h3>

    <ul>
      ${renderList(task.deliverables)}
    </ul>

    <h3>Evaluation Criteria</h3>

    <ul>
      ${renderList(task.evaluation_criteria)}
    </ul>

    ${
      githubRepoUrl
      ? `
      <h3>
        Assigned GitHub Repository
      </h3>

      <p>
        <a href="${githubRepoUrl}">
          ${githubRepoUrl}
        </a>
      </p>

      <p>
        IMPORTANT:
        Repository will be permanently locked
        after the first final submission push.
      </p>
      `
      : ''
    }

    <h3>
      Deadline
    </h3>

    <p>
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

async function processCandidate(
  profile,
  githubRepoUrl
) {

  const roleText =
  (profile.role || '').toLowerCase();

const skillText =
  (
    profile.cv_text ||
    ''
  ).toLowerCase();

const developerKeywords = [
  'react',
  'node',
  'javascript',
  'typescript',
  'frontend',
  'backend',
  'full stack',
  'developer',
  'mern',
  'next.js',
  'mongodb',
  'firebase',
  'express',
  'api'
];

const designKeywords = [
  'figma',
  'ui',
  'ux',
  'designer',
  'wireframe',
  'adobe xd',
  'photoshop'
];

const isDeveloperRole =
  roleText.includes('developer') ||
  roleText.includes('engineer') ||
  roleText.includes('react') ||
  roleText.includes('frontend') ||
  roleText.includes('backend');

const isDesignRole =
  roleText.includes('ui') ||
  roleText.includes('ux') ||
  roleText.includes('designer');

const hasDeveloperSkills =
  developerKeywords.some(keyword =>
    skillText.includes(keyword)
  );

const hasDesignSkills =
  designKeywords.some(keyword =>
    skillText.includes(keyword)
  );

// ONLY REAL MISMATCH

if (
  isDeveloperRole &&
  !hasDeveloperSkills &&
  hasDesignSkills
) {

  const mismatchTask = {
    message:
      'The selected role does not match the candidate technical background and experience.'
  };

  await transporter.sendMail({

    from: process.env.SMTP_EMAIL,

    to: profile.email,

    subject:
      'SensusSoft Application Status',

    html: renderMismatchEmail(
      mismatchTask
    )
  });

  return mismatchTask;
}

if (
  isDesignRole &&
  hasDeveloperSkills &&
  !hasDesignSkills
) {

  const mismatchTask = {
    message:
      'The selected role does not match the candidate technical background and experience.'
  };

  await transporter.sendMail({

    from: process.env.SMTP_EMAIL,

    to: profile.email,

    subject:
      'SensusSoft Application Status',

    html: renderMismatchEmail(
      mismatchTask
    )
  });

  return mismatchTask;
}

const task = await generateTask(profile);

  await transporter.sendMail({

    from: process.env.SMTP_EMAIL,

    to: profile.email,

    subject:
      `SensusSoft Assignment — ${profile.role}`,

    html: renderAssignmentEmail(
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