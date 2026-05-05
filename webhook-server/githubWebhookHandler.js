const githubAutoEvaluator = require('./githubAutoEvaluator');
const hrEvaluationMailer = require('./hrEvaluationMailer');
const { archiveRepo } = require('../github-demo/githubService');

const processedRepos = new Set();

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
    const pusherName = payload.pusher?.name || 'Candidate';
    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const commitCount = commits.length;

    if (!repoName) {
      console.log('[Webhook] Repo name missing');
      return res.status(200).send('Repo data missing');
    }

    // only first push process
    if (processedRepos.has(repoName)) {
      console.log(`[Webhook] Duplicate push ignored for ${repoName}`);
      return res.status(200).send('Duplicate push ignored');
    }

    processedRepos.add(repoName);

    const changedFiles = [];
    commits.forEach(commit => {
      if (Array.isArray(commit.added)) changedFiles.push(...commit.added);
      if (Array.isArray(commit.modified)) changedFiles.push(...commit.modified);
      if (Array.isArray(commit.removed)) changedFiles.push(...commit.removed);
    });

    const submissionTime = payload.head_commit?.timestamp || new Date().toISOString();

    console.log(`[Webhook] FIRST PUSH RECEIVED FOR ${repoName}`);
    console.log(`[Webhook] Candidate => ${pusherName}`);
    console.log(`[Webhook] Commit Count => ${commitCount}`);

    const evaluation = await githubAutoEvaluator({
      repoName,
      repoUrl,
      pusherName,
      commitCount,
      changedFiles,
      submissionTime
    });

    console.log(`[Webhook] Evaluation Done => ${evaluation.finalScore}`);

    await hrEvaluationMailer({
      candidateName: pusherName,
      repoUrl,
      commitCount,
      evaluation
    });

    console.log('[Webhook] HR Mail Sent Successfully');

    try {
      await archiveRepo(repoName);
      console.log(`[Webhook] ${repoName} archived successfully`);
    } catch (archiveErr) {
      console.log('[Webhook] Archive warning =>', archiveErr.message);
    }

    return res.status(200).send('Submission evaluated, HR notified, repository locked.');

  } catch (err) {
    console.error('[Webhook Fatal Error]', err.message);
    console.error(err.stack);
    return res.status(500).send('Internal server error');
  }
};