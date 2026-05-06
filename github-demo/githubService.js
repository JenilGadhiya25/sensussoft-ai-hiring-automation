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
      private: false,
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

IMPORTANT:
Push only one final submission.
After first push this repository becomes permanently locked.`;

  const taskContent = `# ${assignmentTitle}

## Functional Requirements
${assignmentRequirements.map(r => `- ${r}`).join('\n')}

## Submission Rules
- Complete project locally
- Push only one final submission
- Repository permanently frozen after first push`;

  await safeCreateFile(username, repoName, 'README.md', readmeContent);
await safeCreateFile(username, repoName, 'TASK.md', taskContent);

await delay(5000); // important GitHub commit settle wait

await safeCreateWebhook(username, repoName);

  return { url: repoData.html_url, mock: false };
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

async function getDefaultBranch(owner, repo) {
  const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  });
  const data = await resp.json();
  return data.default_branch || 'main';
}

async function lockRepoAfterSubmission(repoName) {
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

  const branch = await getDefaultBranch(owner, repoName);

  // RULESET HARD BLOCK
  await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/rulesets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      name: 'Permanent Submission Freeze',
      target: 'branch',
      enforcement: 'active',
      conditions: {
        ref_name: {
          include: [`refs/heads/${branch}`],
          exclude: []
        }
      },
      rules: [
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        { type: 'creation' },
        { type: 'update' }
      ]
    })
  });

  // branch protection
  await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/branches/${branch}/protection`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      required_status_checks: null,
      enforce_admins: true,
      required_pull_request_reviews: null,
      restrictions: {},
      allow_force_pushes: false,
      allow_deletions: false
    })
  });

  // archive repo
  await fetch(`${GITHUB_API}/repos/${owner}/${repoName}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({ archived: true })
  });

  console.log(`REPO ${repoName} ULTRA LOCKED`);
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

module.exports = { createRepo, lockRepoAfterSubmission };