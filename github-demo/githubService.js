const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';
const GITHUB_USER = process.env.GITHUB_USER || null;

async function createRepo({ fullName, role, assignmentTitle, assignmentRequirements }) {
  if (!GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN in environment');
  }

  let username = GITHUB_USER;

  // STEP 1 USER VERIFY
  const verifyResp = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  });

  const verifyData = await verifyResp.json();
  console.log('GITHUB VERIFY USER =>', verifyData);

  if (!verifyResp.ok) {
    throw new Error('GitHub token invalid: ' + (verifyData.message || JSON.stringify(verifyData)));
  }

  if (!username) username = verifyData.login;

  const repoName = `${slugify(fullName)}-${slugify(role)}-${Date.now()}-demo-task`;

  // STEP 2 CREATE PRIVATE REPO
  let repoResp = await fetch(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      auto_init: true,
      description: `Technical assignment repository for ${fullName} (${role})`
    })
  });

  let repoData = await repoResp.json();
  console.log('GITHUB CREATE PRIVATE =>', repoData);

  // fallback public if private blocked
  if (!repoResp.ok) {
    repoResp = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        name: repoName,
        private: false,
        auto_init: true,
        description: `Technical assignment repository for ${fullName} (${role})`
      })
    });

    repoData = await repoResp.json();
    console.log('GITHUB CREATE PUBLIC FALLBACK =>', repoData);
  }

  if (!repoResp.ok) {
    throw new Error('GitHub repo create failed: ' + (repoData.message || JSON.stringify(repoData)));
  }

  await delay(3000);

  const readmeContent = `# Welcome ${fullName}

This repository has been assigned by SensusSoft Technologies for your technical evaluation.

## Applied Role
${role}

## Important Instructions
- Push your complete source code in this repository
- Maintain clean commit history
- Add setup instructions in README
- Submit within 3 working days

Regards,
SensusSoft HR Team`;

  const taskContent = `# ${assignmentTitle}

## Functional Requirements
${assignmentRequirements.map(r => `- ${r}`).join('\n')}

## Submission Rules
- Maintain professional folder structure
- Commit code regularly
- Add deployment link
- Add README documentation
- Final submission deadline: 3 working days`;

  await safeCreateFile(username, repoName, 'README.md', readmeContent);
  await safeCreateFile(username, repoName, 'TASK.md', taskContent);

  return {
    url: repoData.html_url,
    mock: false
  };
}

async function safeCreateFile(owner, repo, filePath, content){
  try{
    await createFile({ owner, repo, path:filePath, content });
  }catch(err){
    console.log(`FAILED TO CREATE ${filePath} =>`, err.message);
  }
}

async function createFile({ owner, repo, path, content }) {
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      message: `Add ${path}`,
      content: Buffer.from(content, 'utf8').toString('base64')
    })
  });

  const data = await resp.json();
  console.log(`GITHUB FILE ${path} =>`, data);

  if (!resp.ok) {
    throw new Error(`Failed to create ${path}: ` + (data.message || JSON.stringify(data)));
  }
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function delay(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { createRepo };