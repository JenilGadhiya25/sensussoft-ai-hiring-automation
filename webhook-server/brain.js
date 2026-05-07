'use strict';

/**
 * brain.js
 *
 * Core candidate processing engine for SensusSoft AI Hiring Automation.
 *
 * Flow:
 *  1. Role-mismatch validation
 *  2. AI-driven UNIQUE assignment generation via OpenRouter
 *     → AI reads full resume, technologies, projects, experience, domain
 *     → Invents a completely unique enterprise project idea per candidate
 *     → Falls back to taskTemplates.js only if AI fails
 *  3. PDF generation via assignmentPdfGenerator.js
 *  4. Email to candidate with PDF attachment
 *
 * server.js still calls:  processCandidate(profile, githubRepoUrl)
 */

require('dotenv').config();

const nodemailer = require('nodemailer');

const { selectTemplate }        = require('./taskTemplates');
const { generateAssignmentPdf } = require('./assignmentPdfGenerator');

// node-fetch v2 (CommonJS)
global.fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ─────────────────────────────────────────────────────────────────────────────
//  OPENROUTER CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const MODELS = [
  'openai/gpt-4o-mini',
  'openai/gpt-3.5-turbo',
  'mistralai/mistral-7b-instruct'
];

async function callOpenRouter(prompt) {
  let lastErr;

  for (const model of MODELS) {
    try {
      console.log('[Brain] Trying model =>', model);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization:  'Bearer ' + process.env.OPENROUTER_API_KEY,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sensussoft.com',
          'X-Title':      'SensusSoft Hiring Automation'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.85,   // higher = more creative, unique output
          max_tokens:  2000
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.log('[Brain] Model failed =>', model, errText.slice(0, 120));
        lastErr = new Error(errText);
        continue;
      }

      const data = await res.json();
      console.log('[Brain] OpenRouter model used =>', model);
      return data?.choices?.[0]?.message?.content || '';

    } catch (err) {
      console.log('[Brain] Model error =>', model, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All AI models failed');
}

// ─────────────────────────────────────────────────────────────────────────────
//  NODEMAILER
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  DYNAMIC AI PROMPT BUILDER
//  Reads the full candidate profile and instructs the AI to invent a
//  completely unique enterprise project — never the same for any two candidates.
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(profile) {
  const cvBlock = (profile.cv_text || '').trim()
    ? `Candidate Resume / Skills / Projects:\n"""\n${profile.cv_text}\n"""`
    : 'No CV provided — infer from role name only.';

  return `
You are a senior enterprise hiring manager and technical architect at SensusSoft Technologies.

Your task has TWO steps. Read carefully.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:         ${profile.name || 'Candidate'}
Applied Role: ${profile.role || 'Software Developer'}

${cvBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — ROLE MISMATCH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check if the applied role is COMPLETELY incompatible with the candidate background.

VALID combinations (do NOT flag these):
- React / Node / Next.js / Vue / Angular / TypeScript developer applying for any dev role
- Full Stack / MERN / MEAN / Backend / Frontend applying for any dev role
- QA / Tester applying for QA role
- DevOps / Cloud / SRE applying for DevOps role
- UI/UX / Figma / Designer applying for design role
- Python / Data / ML / AI applying for data/ML role
- Product Manager applying for product role
- Partial overlap (e.g. React dev with some Node.js) = VALID

ONLY flag mismatch when background is COMPLETELY unrelated:
- A graphic designer applying for a backend developer role
- A hardware engineer applying for a UI/UX role
- No technical background at all for a senior engineering role

If ROLE_MISMATCH detected, return ONLY this exact JSON and nothing else:
{
  "role_mismatch": true,
  "message": "The selected role does not match your technical background. Please apply for a role that aligns with your actual skills and experience."
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — GENERATE A COMPLETELY UNIQUE ENTERPRISE ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read the candidate's resume deeply:
- What specific technologies do they know?
- What domain have they worked in (fintech, healthcare, ecommerce, SaaS, etc.)?
- What projects have they built before?
- What is their experience level (junior / mid / senior)?
- What are their strongest skills?

Now INVENT a completely unique enterprise project assignment that:
1. Uses their ACTUAL tech stack (not generic)
2. Is in a DIFFERENT or ELEVATED domain than what they've done before
3. Challenges them at the right difficulty level for their seniority
4. Is something a real enterprise company would actually build
5. Is NEVER the same as a generic template

DOMAIN IDEAS to pick from (choose the most relevant to their background):
- AI-powered SaaS platform (analytics, automation, content, HR, legal, finance)
- FinTech platform (payments, trading, banking, crypto, insurance)
- Healthcare ERP (patient management, telemedicine, pharmacy, lab)
- E-commerce analytics (inventory, pricing, recommendation engine)
- Real-time collaboration tool (whiteboard, document editor, project management)
- DevOps / infrastructure automation platform
- IoT dashboard and monitoring system
- Marketplace platform (freelance, rental, B2B)
- EdTech platform (LMS, quiz engine, live classes)
- Logistics and supply chain management system
- CRM / sales automation platform
- Social media analytics dashboard
- Crypto / Web3 portfolio tracker
- Multi-tenant enterprise SaaS workspace

RULES FOR GENERATION:
- Title must be SPECIFIC and UNIQUE (not generic like "REST API" or "Dashboard")
- Scenario must describe a REAL business problem with context
- Requirements must use the candidate's ACTUAL technologies
- Requirements must be 10-14 items, detailed and enterprise-grade
- Deliverables must be 5-7 items, specific and measurable
- Evaluation criteria must be 6-8 items, technical and business-focused
- cv_summary must be a 2-sentence analysis of THIS candidate's specific profile
- detected_seniority: "junior" | "mid" | "senior"
- category: "development" | "design" | "qa" | "devops" | "product"
- deadline_days: 3

CATEGORY RULES:
- development: coding assignment with GitHub repo, deployment required
- design: Figma/design tool, NO coding, wireframes + prototype
- qa: testing framework, test cases, CI/CD integration
- devops: infrastructure, Docker/K8s/CI-CD, no frontend
- product: PRD, user stories, roadmap, no coding

Return ONLY valid JSON, no markdown, no explanation, no code blocks:
{
  "category": "",
  "cv_summary": "",
  "detected_seniority": "",
  "title": "",
  "scenario": "",
  "requirements": [],
  "deliverables": [],
  "evaluation_criteria": [],
  "deadline_days": 3
}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  JSON EXTRACTOR
//  Handles cases where AI wraps JSON in markdown or adds extra text
// ─────────────────────────────────────────────────────────────────────────────

function extractJSON(raw) {
  // Strip markdown code fences
  let text = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Find first { ... } block
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (_) {}
  }

  throw new Error('No valid JSON found in AI response');
}

// ─────────────────────────────────────────────────────────────────────────────
//  TASK VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

function isValidTask(parsed) {
  return (
    parsed &&
    typeof parsed.title              === 'string' && parsed.title.length > 5 &&
    typeof parsed.scenario           === 'string' && parsed.scenario.length > 20 &&
    Array.isArray(parsed.requirements)  && parsed.requirements.length >= 3 &&
    Array.isArray(parsed.deliverables)  && parsed.deliverables.length >= 2 &&
    Array.isArray(parsed.evaluation_criteria) && parsed.evaluation_criteria.length >= 2
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TASK GENERATOR
//  Primary: OpenRouter AI (unique per candidate)
//  Fallback: taskTemplates.js (skill-based dynamic templates)
// ─────────────────────────────────────────────────────────────────────────────

async function generateTask(profile) {

  // ── 1. AI generation ───────────────────────────────────────────────────────
  try {
    const raw    = await callOpenRouter(buildPrompt(profile));
    const parsed = extractJSON(raw);

    console.log('[Brain] Raw AI snippet =>', raw.slice(0, 150));

    // Check if AI detected a role mismatch
    if (parsed.role_mismatch === true) {
      console.log('[Brain] AI detected role mismatch');
      return parsed;
    }

    if (isValidTask(parsed)) {
      // Ensure required fields have defaults
      parsed.category          = parsed.category          || 'development';
      parsed.detected_seniority = parsed.detected_seniority || 'mid';
      parsed.deadline_days     = parsed.deadline_days     || 3;
      parsed.cv_summary        = parsed.cv_summary        || `Candidate applied for ${profile.role}.`;

      console.log('[Brain] AI task accepted =>', parsed.title);
      return parsed;
    }

    console.log('[Brain] AI response invalid — falling back to templates');

  } catch (err) {
    console.log('[Brain] AI generation failed =>', err.message);
    console.log('[Brain] Falling back to taskTemplates.js');
  }

  // ── 2. Template fallback ───────────────────────────────────────────────────
  const template = selectTemplate(profile);
  console.log('[Brain] Template fallback selected =>', template.title);
  return template;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROLE-MISMATCH DETECTOR  (local pre-check before calling AI)
//  Catches obvious mismatches without spending an API call
// ─────────────────────────────────────────────────────────────────────────────

function detectMismatch(profile) {
  const roleText  = (profile.role    || '').toLowerCase();
  const skillText = (profile.cv_text || '').toLowerCase();

  const devKeywords = [
    'react', 'node', 'javascript', 'typescript', 'frontend', 'backend',
    'full stack', 'fullstack', 'developer', 'mern', 'next.js', 'nextjs',
    'mongodb', 'firebase', 'express', 'api', 'python', 'django', 'flask',
    'java', 'spring', 'golang', 'php', 'laravel', 'vue', 'angular',
    'flutter', 'kotlin', 'swift', 'android', 'ios', 'mobile', 'devops',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'qa', 'testing',
    'cypress', 'selenium', 'playwright', 'jest', 'data', 'ml', 'ai',
    'machine learning', 'tensorflow', 'pytorch', 'sql', 'postgres', 'redis'
  ];

  const designKeywords = [
    'figma', 'adobe xd', 'sketch', 'wireframe', 'prototype', 'ui/ux',
    'graphic design', 'photoshop', 'illustrator', 'indesign', 'canva',
    'brand design', 'visual design', 'motion design'
  ];

  const isDeveloperRole =
    roleText.includes('developer') || roleText.includes('engineer') ||
    roleText.includes('react')     || roleText.includes('node')     ||
    roleText.includes('frontend')  || roleText.includes('backend')  ||
    roleText.includes('fullstack') || roleText.includes('full stack') ||
    roleText.includes('devops')    || roleText.includes('qa')       ||
    roleText.includes('python')    || roleText.includes('data')     ||
    roleText.includes('mobile')    || roleText.includes('android')  ||
    roleText.includes('ios');

  const isDesignRole =
    roleText.includes('ui/ux')    || roleText.includes('ui ux')    ||
    roleText.includes('designer') || roleText.includes('ux')       ||
    roleText.includes('figma');

  const hasDevSkills    = devKeywords.some(kw => skillText.includes(kw));
  const hasDesignSkills = designKeywords.some(kw => skillText.includes(kw));

  // Developer role but ONLY design skills and NO dev skills
  if (isDeveloperRole && !hasDevSkills && hasDesignSkills) return true;

  // Design role but ONLY dev skills and NO design skills
  if (isDesignRole && hasDevSkills && !hasDesignSkills) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

function renderList(arr) {
  return (arr || [])
    .map(item => `<li style="margin:8px 0;line-height:1.5">${item}</li>`)
    .join('');
}

function renderMismatchEmail(task) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;color:#333">
    <div style="background:#d32f2f;padding:16px 24px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0">Application Status Update</h2>
    </div>
    <div style="border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      <p style="font-size:15px">${task.message}</p>
      <p style="font-size:14px;color:#555">
        Please review the available roles on our careers page and apply for a position
        that aligns with your actual technical background, skills, and experience.
      </p>
      <p style="margin-top:24px">Regards,<br/><strong>SensusSoft HR Team</strong></p>
    </div>
  </div>`;
}

function renderAssignmentEmail(profile, task, githubRepoUrl) {
  const seniorityBadge = {
    senior: '#1565C0',
    mid:    '#2E7D32',
    junior: '#E65100'
  }[task.detected_seniority || 'mid'] || '#2E7D32';

  return `
  <div style="font-family:Arial,sans-serif;max-width:760px;color:#1a1a1a">

    <!-- Header -->
    <div style="background:#1E3A5F;padding:20px 28px;border-radius:8px 8px 0 0">
      <h1 style="color:#fff;margin:0;font-size:20px">SensusSoft Technologies</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">
        AI Hiring Automation — Personalized Technical Assignment
      </p>
    </div>

    <!-- Body -->
    <div style="border:1px solid #ddd;border-top:none;padding:28px;border-radius:0 0 8px 8px">

      <p style="font-size:15px">Hello <strong>${profile.name || 'Candidate'}</strong>,</p>
      <p style="font-size:14px;line-height:1.6">
        Thank you for applying for the <strong>${profile.role}</strong> role at SensusSoft.
        Our AI hiring system has analyzed your complete profile — including your resume,
        technologies, projects, and experience — and generated a <strong>personalized
        enterprise-level assignment</strong> specifically for you.
      </p>
      <p style="font-size:14px;color:#1565C0">
        📎 <strong>Please find the full assignment documentation attached as a PDF.</strong>
      </p>

      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"/>

      <!-- Title + Seniority -->
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <h2 style="color:#1E3A5F;margin:0;font-size:18px">${task.title}</h2>
        <span style="background:${seniorityBadge};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap">
          ${(task.detected_seniority || 'MID').toUpperCase()} LEVEL
        </span>
      </div>

      <!-- Profile Summary -->
      <div style="background:#F0F7FF;border-left:4px solid #2563EB;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
        <p style="margin:0;font-size:13px;color:#1E3A5F"><strong>Profile Analysis:</strong> ${task.cv_summary}</p>
      </div>

      <!-- Scenario -->
      <h3 style="color:#1E3A5F;font-size:15px;margin-top:20px">Project Scenario</h3>
      <p style="font-size:14px;line-height:1.6;color:#333">${task.scenario}</p>

      <!-- Requirements -->
      <h3 style="color:#1E3A5F;font-size:15px">Assignment Requirements</h3>
      <ul style="padding-left:20px;font-size:14px">${renderList(task.requirements)}</ul>

      <!-- Deliverables -->
      <h3 style="color:#1E3A5F;font-size:15px">Expected Deliverables</h3>
      <ul style="padding-left:20px;font-size:14px">${renderList(task.deliverables)}</ul>

      <!-- Evaluation -->
      <h3 style="color:#1E3A5F;font-size:15px">Evaluation Criteria</h3>
      <ul style="padding-left:20px;font-size:14px">${renderList(task.evaluation_criteria)}</ul>

      ${githubRepoUrl ? `
      <!-- GitHub Repo -->
      <div style="background:#F0F9FF;border:1px solid #2563EB;border-radius:8px;padding:16px;margin:20px 0">
        <h3 style="color:#1E3A5F;margin:0 0 8px;font-size:15px">🔗 Assigned GitHub Repository</h3>
        <a href="${githubRepoUrl}" style="color:#2563EB;font-size:14px">${githubRepoUrl}</a>
        <p style="margin:10px 0 0;font-size:13px;color:#E65100">
          ⚠️ <strong>IMPORTANT:</strong> This repository will be permanently locked after your first push.
          Ensure your submission is complete before pushing.
        </p>
      </div>
      ` : ''}

      <!-- Deadline -->
      <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:14px;color:#166534">
          ⏰ <strong>Deadline:</strong> ${task.deadline_days || 3} Working Days from the date of this email.
        </p>
      </div>

      <p style="font-size:14px;color:#555;margin-top:24px">
        This assignment was generated by SensusSoft AI Hiring Automation and is personalized
        based on your unique profile. Our engineering team reviews every submission carefully.
        Deliver your best work!
      </p>

      <p style="margin-top:24px;font-size:14px">
        Regards,<br/>
        <strong>SensusSoft HR &amp; Engineering Recruitment Team</strong><br/>
        <span style="color:#888;font-size:12px">hr@sensussoft.com | www.sensussoft.com</span>
      </p>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN EXPORT — processCandidate(profile, githubRepoUrl)
//
//  Called by server.js exactly as before:
//    const task = await processCandidate(profile, githubRepoUrl);
//
//  githubRepoUrl is created by server.js → githubService.js BEFORE this call.
//  This function never touches GitHub — that flow is completely unchanged.
// ─────────────────────────────────────────────────────────────────────────────

async function processCandidate(profile, githubRepoUrl) {

  // ── 1. Local role-mismatch pre-check ──────────────────────────────────────
  if (detectMismatch(profile)) {
    console.log('[Brain] Local mismatch detected for =>', profile.name);

    const mismatchTask = {
      role_mismatch: true,
      message: 'The selected role does not match your technical background. Please apply for a role that aligns with your actual skills and experience.'
    };

    try {
      await transporter.sendMail({
        from:    process.env.SMTP_EMAIL,
        to:      profile.email,
        subject: 'SensusSoft — Application Status Update',
        html:    renderMismatchEmail(mismatchTask)
      });
      console.log('[Brain] Mismatch email sent =>', profile.email);
    } catch (mailErr) {
      console.log('[Brain] Mismatch email failed =>', mailErr.message);
    }

    return mismatchTask;
  }

  // ── 2. Generate unique AI task ─────────────────────────────────────────────
  const task = await generateTask(profile);

  // If AI itself returned a mismatch signal
  if (task.role_mismatch === true) {
    console.log('[Brain] AI mismatch signal for =>', profile.name);

    try {
      await transporter.sendMail({
        from:    process.env.SMTP_EMAIL,
        to:      profile.email,
        subject: 'SensusSoft — Application Status Update',
        html:    renderMismatchEmail(task)
      });
      console.log('[Brain] AI mismatch email sent =>', profile.email);
    } catch (mailErr) {
      console.log('[Brain] AI mismatch email failed =>', mailErr.message);
    }

    return task;
  }

  // ── 3. Generate PDF ────────────────────────────────────────────────────────
  let pdfPath = null;

  try {
    pdfPath = await generateAssignmentPdf(profile, task, githubRepoUrl);
    console.log('[Brain] PDF generated =>', pdfPath);
  } catch (pdfErr) {
    console.log('[Brain] PDF generation failed (non-fatal) =>', pdfErr.message);
  }

  // ── 4. Send assignment email ───────────────────────────────────────────────
  try {
    const mailOptions = {
      from:    process.env.SMTP_EMAIL,
      to:      profile.email,
      subject: `SensusSoft Assignment — ${task.title || profile.role}`,
      html:    renderAssignmentEmail(profile, task, githubRepoUrl)
    };

    if (pdfPath) {
      mailOptions.attachments = [{
        filename: `SensusSoft_Assignment_${(profile.name || 'Candidate').replace(/\s+/g, '_')}.pdf`,
        path:     pdfPath
      }];
    }

    await transporter.sendMail(mailOptions);
    console.log('[Brain] Assignment email sent =>', profile.email);

  } catch (mailErr) {
    console.log('[Brain] Assignment email failed =>', mailErr.message);
  }

  return task;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = { processCandidate };
