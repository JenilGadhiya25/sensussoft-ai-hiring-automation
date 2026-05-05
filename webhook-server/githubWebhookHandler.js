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
      return res.status(200).send('Repo missing');
    }

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

    console.log(`[Webhook] FIRST PUSH RECEIVED => ${repoName}`);

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
      console.log('[Webhook] Evaluation success');
    } catch (evalErr) {
      console.log('[Webhook] Evaluator warning =>', evalErr.message);
    }

    try {
      await hrEvaluationMailer({
        candidateName: pusherName,
        repoUrl,
        commitCount,
        evaluation
      });
      console.log('[Webhook] HR mail success');
    } catch (mailErr) {
      console.log('[Webhook] Mail warning =>', mailErr.message);
    }

    try {
      await archiveRepo(repoName);
      console.log('[Webhook] Archive success');
    } catch (archiveErr) {
      console.log('[Webhook] Archive warning =>', archiveErr.message);
    }

    return res.status(200).send('Submission processed successfully');

  } catch (err) {
    console.error('[Webhook Fatal Error]', err.message);
    return res.status(200).send('Webhook recovered safely');
  }
};