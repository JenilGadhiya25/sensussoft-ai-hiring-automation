// githubService.js
// Creates a private GitHub repo for a candidate, adds README.md and TASK.md, returns repo URL
// If GITHUB_TOKEN is missing, returns a mock response

const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';
const GITHUB_USER = process.env.GITHUB_USER || null; // Optional override

async function createRepo({ fullName, role, assignmentTitle, assignmentRequirements }) {
  if (!GITHUB_TOKEN) {
    // Mock for demo
    return {
      url: `https://github.com/mock/${slugify(fullName)}-${slugify(role)}-demo-task`,
      mock: true
    };
  }

  // Get username if not provided
  let username = GITHUB_USER;
  if (!username) {
    const userResp = await fetch(GITHUB_API + '/user', {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    const userData = await userResp.json();
    username = userData.login;
  }

  // Repo name
const repoName = `${slugify(fullName)}-${slugify(role)}-${Date.now()}-demo-task`;

  // Create repo
  const repoResp = await fetch(GITHUB_API + '/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      auto_init: false,
      description: `Demo assignment for ${fullName} (${role})`
    })
  });
  const repoData = await repoResp.json();
  if (!repoResp.ok) throw new Error('GitHub repo create failed: ' + (repoData.message || JSON.stringify(repoData)));

  // Prepare files
  const readmeContent = `# Welcome, ${fullName}\n\nThis repository contains your technical assignment for the role: **${role}**.`;
  const taskContent = `# ${assignmentTitle}\n\n## Requirements\n${assignmentRequirements.map(r => `- ${r}`).join('\n')}`;

  // Create README.md
  await createFile({
    owner: username,
    repo: repoName,
    path: 'README.md',
    content: readmeContent
  });
  // Create TASK.md
  await createFile({
    owner: username,
    repo: repoName,
    path: 'TASK.md',
    content: taskContent
  });

  return {
    url: repoData.html_url,
    mock: false
  };
}

async function createFile({ owner, repo, path, content }) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    },
    body: JSON.stringify({
      message: `Add ${path}`,
      content: Buffer.from(content, 'utf8').toString('base64')
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Failed to create ${path}: ` + (data.message || JSON.stringify(data)));
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

module.exports = { createRepo };
