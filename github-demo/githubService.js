const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';
const GITHUB_USER = process.env.GITHUB_USER || null;

async function createRepo({ fullName, role, assignmentTitle, assignmentRequirements }) {
  if (!GITHUB_TOKEN) {
    return {
      url: `https://github.com/mock/${slugify(fullName)}-${slugify(role)}-demo-task`,
      mock: true
    };
  }

  let username = GITHUB_USER;

  if (!username) {
    const userResp = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    });

    const userData = await userResp.json();
    username = userData.login;
  }

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

  await delay(2000);

  const readmeContent = `# Welcome ${fullName}

This private repository has been assigned by SensusSoft Technologies for your technical evaluation.

## Applied Role
${role}

## Important Instructions
- Push your complete source code in this repository
- Maintain clean commit history
- Add setup steps in README
- Submit within 3 working days

Best Regards,
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

  await createFile({
    owner: username,
    repo: repoName,
    path: 'README.md',
    content: readmeContent
  });

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