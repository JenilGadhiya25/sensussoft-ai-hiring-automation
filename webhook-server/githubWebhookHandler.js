const githubAutoEvaluator = require('./githubAutoEvaluator');
const hrEvaluationMailer = require('./hrEvaluationMailer');
const { archiveRepo } = require('../github-demo/githubService');

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

    if (!repoName) return res.status(200).send('Repo missing');

    // IMPORTANT: ignore owner starter commits
    if (GITHUB_USER && pusherName.toLowerCase() === GITHUB_USER.toLowerCase()) {
      console.log('[Webhook] Owner self push ignored');
      return res.status(200).send('Owner push ignored');
    }

    if (processedRepos.has(repoName)) {
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

    let evaluation = { finalScore: 0, aiRemark: 'Evaluation failed', pdfPath: null };

    try {
      evaluation = await githubAutoEvaluator({
        repoName,
        repoUrl,
        pusherName,
        commitCount,
        changedFiles,
        submissionTime
      });
    } catch (e) {}

    try {
      await hrEvaluationMailer({
        candidateName: pusherName,
        repoUrl,
        commitCount,
        evaluation
      });
    } catch (e) {}

    try {
      await archiveRepo(repoName);
    } catch (e) {}

    return res.status(200).send('Candidate submission processed');

  } catch (err) {
    return res.status(200).send('Webhook safe recovered');
  }
};