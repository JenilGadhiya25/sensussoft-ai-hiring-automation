const githubAutoEvaluator = require('./githubAutoEvaluator');
const hrEvaluationMailer = require('./hrEvaluationMailer');
const fs = require('fs');
const path = require('path');

const AUDIT_LOG_PATH = path.join(__dirname, '../audit-logs/submission-evaluation-log.json');

module.exports = async function githubWebhookHandler(req, res) {
  try {
    const eventType = req.headers['x-github-event'];

    if (eventType === 'ping') {
      console.log('[Webhook] GitHub ping received successfully');
      return res.status(200).send('GitHub webhook ping success');
    }

    if (eventType !== 'push') {
      return res.status(200).send('Event ignored');
    }

    const payload = req.body || {};
    const repoName = payload.repository?.name || '';
    const repoUrl = payload.repository?.html_url || '';
    const pusherName = payload.pusher?.name || '';
    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const commitCount = commits.length;

    const changedFiles = [];
    commits.forEach(commit => {
      if (Array.isArray(commit.added)) changedFiles.push(...commit.added);
      if (Array.isArray(commit.modified)) changedFiles.push(...commit.modified);
      if (Array.isArray(commit.removed)) changedFiles.push(...commit.removed);
    });

    const submissionTime = payload.head_commit?.timestamp || new Date().toISOString();

    console.log(`[Webhook] Received push for repo: ${repoName} by ${pusherName}`);

    const evaluation = await githubAutoEvaluator({
      repoName,
      repoUrl,
      pusherName,
      commitCount,
      changedFiles,
      submissionTime
    });

    await hrEvaluationMailer({
      candidateName: pusherName,
      repoUrl,
      commitCount,
      evaluation
    });

    let logs = [];
    if (fs.existsSync(AUDIT_LOG_PATH)) {
      try {
        logs = JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, 'utf8'));
      } catch {
        logs = [];
      }
    }

    logs.push({
      candidateName: pusherName,
      repoName,
      repoUrl,
      submissionTime,
      finalScore: evaluation.finalScore,
      aiRemark: evaluation.aiRemark,
      event: 'submission-evaluated'
    });

    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2));

    return res.status(200).send('Submission evaluated and HR notified.');

  } catch (err) {
    console.error('[Webhook Error]', err);
    return res.status(500).send('Internal server error');
  }
};