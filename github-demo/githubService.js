const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';
const GITHUB_USER = process.env.GITHUB_USER || null;

async function createRepo({ fullName, role, assignmentTitle, assignmentRequirements }) {
  if (!GITHUB_TOKEN) throw new Error('Missing GITHUB_TOKEN in environment');

  let username = GITHUB_USER;

  const verifyResp = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  });

  const verifyData = await verifyResp.json();
  if (!verifyResp.ok) {
    throw new Error('GitHub token invalid: ' + (verifyData.message || JSON.stringify(verifyData)));
  }

  if (!username) username = verifyData.login;

  const repoName = `${slugify(fullName)}-${slugify(role)}-${Date.now()}-demo-task`;

  const repoResp = await fetch(`${GITHUB_API}/user/repos`, {
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

  const repoData = await repoResp.json();
  if (!repoResp.ok) {
    throw new Error('GitHub repo create failed: ' + (repoData.message || JSON.stringify(repoData)));
  }

  await delay(2500);

  const readmeContent = `# Welcome ${fullName}

This repository has been assigned by SensusSoft Technologies for your technical evaluation.

## Applied Role
${role}

## Important Instructions
- Clone this repository to your local machine
- Complete the technical assignment
- Push source code only once as final submission
- After first final push repository will be locked automatically

Regards,
SensusSoft HR Team`;

  const taskContent = `# ${assignmentTitle}

## Functional Requirements
${assignmentRequirements.map(r => `- ${r}`).join('\n')}

## Submission Rules
- Complete project locally
- Push only one final submission
- Repository auto archive after first candidate push
- Add deployment link and README`;

  await safeCreateFile(username, repoName, 'README.md', readmeContent);
  await safeCreateFile(username, repoName, 'TASK.md', taskContent);

  // webhook create AFTER starter files
  await safeCreateWebhook(username, repoName);

  return {
    url: repoData.html_url,
    mock: false
  };
}

async function safeCreateWebhook(owner, repo) {
  try {
    const webhookUrl = 'https://sensussoft-ai-hiring-automation.vercel.app/api/github-submission-webhook';

    await fetch(`${GITHUB_API}/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          insecure_ssl: '0'
        }
      })
    });
  } catch (err) {
    console.log('WEBHOOK ERROR =>', err.message);
  }
}

async function archiveRepo(repoName) {
  let owner = GITHUB_USER;

  if (!owner) {
    const verifyResp = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    });
    const verifyData = await verifyResp.json();
    owner = verifyData.login;
  }

  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({ archived: true })
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || 'Archive failed');
}

async function safeCreateFile(owner, repo, filePath, content) {
  try {
    await createFile({ owner, repo, path: filePath, content });
  } catch (err) {
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

  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || `Failed ${path}`);
  }
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { createRepo, archiveRepo };