const githubAutoEvaluator = require('./githubAutoEvaluator');
const hrEvaluationMailer = require('./hrEvaluationMailer');
const { lockRepoAfterSubmission } = require('../github-demo/githubService');

const processedRepos = new Set();
const GITHUB_USER = process.env.GITHUB_USER || '';

module.exports = async function githubWebhookHandler(req, res) {
  try {
    const eventType = req.headers['x-github-event'];

    if (eventType === 'ping') {
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
      return res.status(200).send('Repo missing');
    }

    // Ignore owner automatic starter commits
    if (GITHUB_USER && pusherName.toLowerCase() === GITHUB_USER.toLowerCase()) {
      console.log('[Webhook] Owner starter push ignored');
      return res.status(200).send('Owner push ignored');
    }

    // Allow only one candidate push lifetime
    if (processedRepos.has(repoName)) {
      console.log('[Webhook] Repo already permanently finalized');
      return res.status(200).send('Final submission already accepted');
    }

    processedRepos.add(repoName);

    const changedFiles = [];
    commits.forEach(commit => {
      if (Array.isArray(commit.added)) changedFiles.push(...commit.added);
      if (Array.isArray(commit.modified)) changedFiles.push(...commit.modified);
      if (Array.isArray(commit.removed)) changedFiles.push(...commit.removed);
    });

    const submissionTime = payload.head_commit?.timestamp || new Date().toISOString();

    let evaluation = {
      finalScore: 0,
      aiRemark: 'Evaluation failed',
      pdfPath: null
    };

    try {
      evaluation = await githubAutoEvaluator({
        repoName,
        repoUrl,
        pusherName,
        commitCount,
        changedFiles,
        submissionTime
      });
      console.log('[Webhook] Evaluation completed');
    } catch (e) {
      console.log('[Webhook] Evaluator Error =>', e.message);
    }

    try {
      await hrEvaluationMailer({
        candidateName: pusherName,
        repoUrl,
        commitCount,
        evaluation
      });
      console.log('[Webhook] HR mail sent');
    } catch (e) {
      console.log('[Webhook] HR Mail Error =>', e.message);
    }

    try {
      await lockRepoAfterSubmission(repoName);
      console.log('[Webhook] Repository permanent lock applied');
    } catch (e) {
      console.log('[Webhook] Permanent Lock Error =>', e.message);
    }

    console.log('[Webhook] FIRST CANDIDATE PUSH ACCEPTED -> REPOSITORY FROZEN FOREVER');
    return res.status(200).send('Final submission accepted and repository permanently locked');

  } catch (err) {
    console.log('[Webhook Fatal]', err.message);
    return res.status(200).send('Webhook safe recovered');
  }
};