const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function githubGet(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  });

  if (!res.ok) return null;
  return await res.json();
}

async function getDefaultBranch(repoFullName) {
  const repo = await githubGet(`https://api.github.com/repos/${repoFullName}`);
  return repo && repo.default_branch ? repo.default_branch : 'main';
}

async function fetchRepoTree(repoFullName) {
  const branch = await getDefaultBranch(repoFullName);
  const data = await githubGet(`https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`);
  return data && data.tree ? data.tree : [];
}

async function fetchCommits(repoFullName) {
  const data = await githubGet(`https://api.github.com/repos/${repoFullName}/commits`);
  return Array.isArray(data) ? data : [];
}

async function fetchFileExists(repoFullName, filePath) {
  const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  });
  return res.status === 200;
}

async function fetchReadmeContent(repoFullName) {
  const res = await fetch(`https://api.github.com/repos/${repoFullName}/readme`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.raw'
    }
  });

  if (!res.ok) return '';
  return await res.text();
}

function checkFolderExists(tree, folderPath) {
  return tree.some(f => f.path.toLowerCase().startsWith(folderPath.toLowerCase() + '/'));
}

function countSourceFiles(tree) {
  return tree.filter(f => /\.(js|jsx|ts|tsx|html|css)$/i.test(f.path)).length;
}

function checkDeploymentProof(readmeContent) {
  if (!readmeContent) return false;
  return /https?:\/\/[^\s]+/i.test(readmeContent) && /(deploy|demo|live)/i.test(readmeContent);
}

function checkScreenshots(tree) {
  return tree.some(f =>
    /screenshot|demo|assets/i.test(f.path) &&
    /\.(png|jpg|jpeg|gif|webp)$/i.test(f.path)
  );
}

function getScore(b) {
  let score = 0;
  score += b.readmeExists ? 10 : 0;
  score += b.taskExists ? 10 : 0;
  score += (b.frontendExists && b.backendExists) ? 10 : 0;
  score += b.commitCount >= 3 ? 10 : (b.commitCount > 0 ? 5 : 0);
  score += b.frontendExists ? 15 : 0;
  score += b.backendExists ? 15 : 0;
  score += (b.packageJsonExists && b.srcComponentsExists && b.srcPagesExists) ? 10 : 0;
  score += b.deploymentProof ? 10 : 0;
  score += b.completeness ? 10 : 0;
  return score;
}

function getRemark(score) {
  if (score > 85) return 'Excellent Submission';
  if (score > 70) return 'Good Submission';
  if (score > 50) return 'Partial Submission';
  return 'Weak Submission';
}

module.exports = async function githubAutoEvaluator({
  repoName,
  repoUrl,
  pusherName,
  commitCount,
  changedFiles,
  submissionTime
}) {
  try {
    const repoFullName = repoUrl.replace('https://github.com/', '').trim();

    const tree = await fetchRepoTree(repoFullName);
    const commits = await fetchCommits(repoFullName);

    const readmeExists = await fetchFileExists(repoFullName, 'README.md');
    const taskExists = await fetchFileExists(repoFullName, 'TASK.md');
    const packageJsonExists = await fetchFileExists(repoFullName, 'package.json');

    const frontendExists = checkFolderExists(tree, 'frontend') || checkFolderExists(tree, 'src');
    const backendExists = checkFolderExists(tree, 'backend') || checkFolderExists(tree, 'server');
    const srcComponentsExists = checkFolderExists(tree, 'src/components');
    const srcPagesExists = checkFolderExists(tree, 'src/pages');

    const filesCount = countSourceFiles(tree);
    const readmeContent = await fetchReadmeContent(repoFullName);
    const deploymentProof = checkDeploymentProof(readmeContent);
    const screenshots = checkScreenshots(tree);

    const completeness =
      readmeExists &&
      taskExists &&
      packageJsonExists &&
      filesCount >= 5;

    const breakdown = {
      readmeExists,
      taskExists,
      frontendExists,
      backendExists,
      packageJsonExists,
      srcComponentsExists,
      srcPagesExists,
      commitCount: commits.length,
      filesCount,
      deploymentProof,
      screenshots,
      completeness
    };

    const finalScore = getScore(breakdown);
    const aiRemark = getRemark(finalScore);

    const pdfPath = path.join(__dirname, `candidate-submission-evaluation-${Date.now()}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(fs.createWriteStream(pdfPath));

    doc.fontSize(18).text('Candidate Task Submission Evaluation Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Candidate Name: ${pusherName}`);
    doc.text(`Repository Name: ${repoName}`);
    doc.text(`Repository URL: ${repoUrl}`);
    doc.text(`Submission Time: ${submissionTime}`);
    doc.text(`Commit Count: ${commits.length}`);
    doc.text(`Source Files Count: ${filesCount}`);
    doc.moveDown();

    doc.fontSize(14).text('Evaluation Breakdown');
    doc.fontSize(12).text(`README.md Exists: ${readmeExists ? 'Yes' : 'No'}`);
    doc.text(`TASK.md Exists: ${taskExists ? 'Yes' : 'No'}`);
    doc.text(`Frontend Present: ${frontendExists ? 'Yes' : 'No'}`);
    doc.text(`Backend Present: ${backendExists ? 'Yes' : 'No'}`);
    doc.text(`package.json Exists: ${packageJsonExists ? 'Yes' : 'No'}`);
    doc.text(`src/components Exists: ${srcComponentsExists ? 'Yes' : 'No'}`);
    doc.text(`src/pages Exists: ${srcPagesExists ? 'Yes' : 'No'}`);
    doc.text(`Deployment Proof: ${deploymentProof ? 'Yes' : 'No'}`);
    doc.text(`Screenshots/Assets: ${screenshots ? 'Yes' : 'No'}`);
    doc.moveDown();

    doc.fontSize(14).text(`Final Automated Score: ${finalScore}/100`);
    doc.fontSize(13).text(`AI Remark: ${aiRemark}`);
    doc.moveDown(2);
    doc.text('Regards,');
    doc.text('SensusSoft AI Evaluation Bot');

    doc.end();

    console.log(`[Evaluator] Completed for ${pusherName} Score=${finalScore}`);

    return {
      candidateName: pusherName,
      repoUrl,
      submissionTime,
      commitCount: commits.length,
      filesCount,
      breakdown,
      finalScore,
      aiRemark,
      pdfPath
    };

  } catch (err) {
    console.error('[Evaluator Error]', err.message);
    throw err;
  }
};