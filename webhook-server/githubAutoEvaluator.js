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
  return /https?:\/\/[^\s]+/i.test(readmeContent);
}

function checkScreenshots(tree) {
  return tree.some(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f.path));
}

function getScore(b) {
  let score = 0;
  score += b.readmeExists ? 10 : 0;
  score += b.taskExists ? 10 : 0;
  score += (b.frontendExists || b.backendExists) ? 15 : 0;
  score += b.commitCount >= 1 ? 10 : 0;
  score += b.packageJsonExists ? 10 : 0;
  score += b.filesCount >= 3 ? 15 : 0;
  score += b.deploymentProof ? 10 : 0;
  score += b.screenshots ? 10 : 0;
  score += b.completeness ? 10 : 0;
  return score;
}

function getRemark(score) {
  if (score > 85) return 'Excellent Submission';
  if (score > 70) return 'Good Submission';
  if (score > 50) return 'Average Submission';
  return 'Weak Submission';
}

function generatePdfReport(data) {
  return new Promise((resolve) => {
    const pdfPath = path.join('/tmp', `candidate-report-${Date.now()}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(18).text('Candidate Task Submission Evaluation Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Candidate Name: ${data.pusherName}`);
    doc.text(`Repository Name: ${data.repoName}`);
    doc.text(`Repository URL: ${data.repoUrl}`);
    doc.text(`Submission Time: ${data.submissionTime}`);
    doc.text(`Commit Count: ${data.commitCount}`);
    doc.text(`Source Files Count: ${data.filesCount}`);
    doc.moveDown();
    doc.text(`Final Automated Score: ${data.finalScore}/100`);
    doc.text(`AI Remark: ${data.aiRemark}`);
    doc.end();

    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', () => resolve(null));
  });
}

module.exports = async function githubAutoEvaluator({
  repoName,
  repoUrl,
  pusherName,
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
    const filesCount = countSourceFiles(tree);
    const readmeContent = await fetchReadmeContent(repoFullName);
    const deploymentProof = checkDeploymentProof(readmeContent);
    const screenshots = checkScreenshots(tree);

    const completeness = readmeExists && taskExists && filesCount >= 3;

    const breakdown = {
      readmeExists,
      taskExists,
      frontendExists,
      backendExists,
      packageJsonExists,
      commitCount: commits.length,
      filesCount,
      deploymentProof,
      screenshots,
      completeness
    };

    const finalScore = getScore(breakdown);
    const aiRemark = getRemark(finalScore);

    const pdfPath = await generatePdfReport({
      pusherName,
      repoName,
      repoUrl,
      submissionTime,
      commitCount: commits.length,
      filesCount,
      finalScore,
      aiRemark
    });

    return {
      finalScore,
      aiRemark,
      pdfPath
    };

  } catch (err) {
    console.log('[Evaluator Error]', err.message);
    return {
      finalScore: 0,
      aiRemark: 'Evaluation failed',
      pdfPath: null
    };
  }
};