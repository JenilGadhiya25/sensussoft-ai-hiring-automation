const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';
const GITHUB_USER = process.env.GITHUB_USER || null;

async function createRepo({ fullName, role, assignmentTitle, assignmentRequirements }) {
  if (!GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN in environment');
  }

  let username = GITHUB_USER;

  // verify github token
  const verifyResp = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  });

  const verifyData = await verifyResp.json();

  if (!verifyResp.ok) {
    throw new Error(
      'GitHub token invalid: ' +
      (verifyData.message || JSON.stringify(verifyData))
    );
  }

  if (!username) {
    username = verifyData.login;
  }

  const repoName = `${slugify(fullName)}-${slugify(role)}-${Date.now()}-demo-task`;

  // create repository
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
    throw new Error(
      'GitHub repo create failed: ' +
      (repoData.message || JSON.stringify(repoData))
    );
  }

  // wait for github repo initialization
  await delay(4000);

  const readmeContent = `# Welcome ${fullName}

This repository has been assigned by SensusSoft Technologies for your technical evaluation.

IMPORTANT:
- Push only one final submission
- After first push this repository becomes permanently locked
- Add proper README and deployment proof
`;

  const taskContent = `# ${assignmentTitle}

## Functional Requirements
${assignmentRequirements.map(r => `- ${r}`).join('\n')}

## Submission Rules
- Complete project locally
- Push only one final submission
- Repository permanently frozen after first push
`;

  // create starter files
  await safeCreateFile(username, repoName, 'README.md', readmeContent);
  await safeCreateFile(username, repoName, 'TASK.md', taskContent);

  // important github sync wait
  await delay(5000);

  // attach webhook LAST
  await safeCreateWebhook(username, repoName);

  // wait for public propagation
  await delay(4000);

  // verify repository exists publicly
  const verifyPublicRepo = await fetch(
    `${GITHUB_API}/repos/${username}/${repoName}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    }
  );

  if (!verifyPublicRepo.ok) {
    throw new Error('Repository verification failed');
  }

  const verifiedRepoData = await verifyPublicRepo.json();

  console.log(`PUBLIC REPOSITORY READY => ${verifiedRepoData.html_url}`);

  return {
    url: verifiedRepoData.html_url,
    mock: false
  };
}

async function safeCreateWebhook(owner, repo) {
  try {
    const webhookUrl =
      'https://sensussoft-ai-hiring-automation.vercel.app/api/github-submission-webhook';

    const webhookResp = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/hooks`,
      {
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
      }
    );

    if (!webhookResp.ok) {
      const errData = await webhookResp.json();
      console.log('WEBHOOK CREATE FAILED =>', errData.message);
    } else {
      console.log(`WEBHOOK ATTACHED => ${repo}`);
    }
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

  // create hard ruleset
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

  // protect branch
  await fetch(
    `${GITHUB_API}/repos/${owner}/${repoName}/branches/${branch}/protection`,
    {
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
    }
  );

  // archive repository
  await fetch(`${GITHUB_API}/repos/${owner}/${repoName}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      archived: true
    })
  });

  console.log(`REPOSITORY PERMANENTLY LOCKED => ${repoName}`);
}

async function safeCreateFile(owner, repo, filePath, content) {
  try {
    await createFile({
      owner,
      repo,
      path: filePath,
      content
    });
  } catch (err) {
    console.log(`FAILED TO CREATE ${filePath} =>`, err.message);
  }
}

async function createFile({ owner, repo, path, content }) {
  const resp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
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
    }
  );

  if (!resp.ok) {
    const data = await resp.json();
    throw new Error(data.message || `Failed ${path}`);
  }
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createRepo,
  lockRepoAfterSubmission
};