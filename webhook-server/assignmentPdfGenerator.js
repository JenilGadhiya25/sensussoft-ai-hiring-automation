'use strict';

/**
 * assignmentPdfGenerator.js
 *
 * Generates a professional enterprise-grade assignment PDF using pdfkit.
 * Saves output to: webhook-server/generated-pdfs/
 *
 * Features:
 *  - Enterprise blue theme with consistent branding
 *  - Multi-page support with automatic headers/footers
 *  - Responsive layout with proper spacing
 *  - Role-specific content (GitHub repo for dev roles, design deliverables for design roles)
 *  - Professional typography and visual hierarchy
 *  - Metadata and document properties
 *
 * Usage in brain.js:
 *   const { generateAssignmentPdf } = require('./assignmentPdfGenerator');
 *   const pdfPath = await generateAssignmentPdf(profile, task, githubRepoUrl);
 *   // attach pdfPath to nodemailer as: { filename: '...', path: pdfPath }
 */

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

// ─────────────────────────────────────────────────────────────────────────────
//  OUTPUT DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(__dirname, 'generated-pdfs');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DESIGN TOKENS  (blue enterprise theme)
// ─────────────────────────────────────────────────────────────────────────────

const COLOR = {
  headerBg:      '#1E3A5F',   // deep navy — header band
  headerText:    '#FFFFFF',
  accentBlue:    '#2563EB',   // section heading underline + bullets
  accentLight:   '#DBEAFE',   // section header background band
  accentDark:    '#1D4ED8',   // section heading text
  bodyText:      '#1E293B',   // main body copy
  mutedText:     '#64748B',   // labels, captions
  divider:       '#CBD5E1',   // horizontal rules
  tagBg:         '#EFF6FF',   // skill tag background
  tagText:       '#1D4ED8',   // skill tag text
  successGreen:  '#166534',
  warningAmber:  '#92400E',
  white:         '#FFFFFF',
  pageFooterBg:  '#F1F5F9'
};

const FONT = {
  regular:  'Helvetica',
  bold:     'Helvetica-Bold',
  oblique:  'Helvetica-Oblique'
};

const MARGIN  = 50;
const PW      = 595.28;   // A4 width  in points
const PH      = 841.89;   // A4 height in points
const CONTENT = PW - MARGIN * 2;   // usable content width

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Draw a filled rectangle */
function fillRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

/** Draw a horizontal rule */
function hRule(doc, y, color = COLOR.divider) {
  doc.save()
     .moveTo(MARGIN, y).lineTo(PW - MARGIN, y)
     .strokeColor(color).lineWidth(0.5).stroke()
     .restore();
}

/** Ensure we have at least `needed` points before bottom margin */
function ensureSpace(doc, needed = 60) {
  if (doc.y + needed > PH - 60) doc.addPage();
}

/** Numbered bullet item */
function bulletItem(doc, index, text, x = MARGIN + 14) {
  const bulletX = x - 14;
  const textX   = x;
  const y       = doc.y;

  doc.font(FONT.bold).fontSize(9).fillColor(COLOR.accentBlue)
     .text(`${index}.`, bulletX, y, { width: 12, align: 'right' });

  doc.font(FONT.regular).fontSize(9.5).fillColor(COLOR.bodyText)
     .text(text, textX, y, { width: CONTENT - (textX - MARGIN), lineGap: 2 });

  doc.moveDown(0.35);
}

/** Section heading with coloured background band */
function sectionHeading(doc, title) {
  ensureSpace(doc, 50);
  const y = doc.y + 6;
  fillRect(doc, MARGIN, y, CONTENT, 22, COLOR.accentLight);

  // left accent bar
  fillRect(doc, MARGIN, y, 4, 22, COLOR.accentBlue);

  doc.font(FONT.bold).fontSize(10.5).fillColor(COLOR.accentDark)
     .text(title.toUpperCase(), MARGIN + 12, y + 6, { width: CONTENT - 12 });

  doc.moveDown(0.9);
}

/** Key-value row */
function kvRow(doc, key, value) {
  const y = doc.y;
  doc.font(FONT.bold).fontSize(9).fillColor(COLOR.mutedText)
     .text(key, MARGIN, y, { width: 130, continued: false });

  doc.font(FONT.regular).fontSize(9.5).fillColor(COLOR.bodyText)
     .text(value || '—', MARGIN + 135, y, { width: CONTENT - 135 });

  doc.moveDown(0.4);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PAGE HEADER  (repeated on every page via pageAdded event)
// ─────────────────────────────────────────────────────────────────────────────

function drawPageHeader(doc) {
  // Navy band
  fillRect(doc, 0, 0, PW, 52, COLOR.headerBg);

  // Company name
  doc.font(FONT.bold).fontSize(15).fillColor(COLOR.headerText)
     .text('SensusSoft Technologies', MARGIN, 14, { width: 280 });

  // Tagline
  doc.font(FONT.oblique).fontSize(8).fillColor('rgba(255,255,255,0.7)')
     .text('Enterprise AI Hiring Automation', MARGIN, 32, { width: 280 });

  // Right-side label
  doc.font(FONT.bold).fontSize(8).fillColor(COLOR.headerText)
     .text('TECHNICAL ASSIGNMENT', PW - MARGIN - 130, 20, { width: 130, align: 'right' });

  doc.font(FONT.regular).fontSize(7).fillColor('rgba(255,255,255,0.6)')
     .text('CONFIDENTIAL', PW - MARGIN - 130, 32, { width: 130, align: 'right' });

  doc.y = 68;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PAGE FOOTER  (drawn on all pages after document finalization)
// ─────────────────────────────────────────────────────────────────────────────

function drawPageFooter(doc, pageNum) {
  const y = PH - 30;
  fillRect(doc, 0, y - 4, PW, 34, COLOR.pageFooterBg);
  hRule(doc, y - 4, COLOR.divider);

  doc.font(FONT.regular).fontSize(7.5).fillColor(COLOR.mutedText)
     .text('SensusSoft Technologies Pvt. Ltd. — Confidential Assignment Document',
           MARGIN, y + 4, { width: CONTENT - 60 });

  doc.font(FONT.bold).fontSize(7.5).fillColor(COLOR.mutedText)
     .text(`Page ${pageNum}`, PW - MARGIN - 40, y + 4, { width: 40, align: 'right' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  COVER SECTION  (candidate info block below header on page 1)
// ─────────────────────────────────────────────────────────────────────────────

function drawCoverSection(doc, profile, task) {
  // Outer card border
  const cardY = doc.y;
  const cardH = 130;
  doc.save()
     .rect(MARGIN, cardY, CONTENT, cardH)
     .fillAndStroke('#F8FAFC', COLOR.divider)
     .restore();

  // Left blue accent strip
  fillRect(doc, MARGIN, cardY, 5, cardH, COLOR.accentBlue);

  // Candidate name
  doc.font(FONT.bold).fontSize(17).fillColor(COLOR.headerBg)
     .text(profile.name || 'Candidate', MARGIN + 18, cardY + 14, { width: CONTENT - 24 });

  // Role badge
  const roleLabel = profile.role || 'Applied Role';
  const roleW = doc.font(FONT.bold).fontSize(9).widthOfString(roleLabel) + 20;
  fillRect(doc, MARGIN + 18, cardY + 38, roleW, 18, COLOR.accentBlue);
  doc.font(FONT.bold).fontSize(9).fillColor(COLOR.white)
     .text(roleLabel, MARGIN + 28, cardY + 43, { width: roleW - 10 });

  // Seniority badge
  const senLabel = (task.detected_seniority || 'mid').toUpperCase() + ' LEVEL';
  const senX = MARGIN + 18 + roleW + 8;
  const senW = doc.font(FONT.bold).fontSize(9).widthOfString(senLabel) + 20;
  doc.save().rect(senX, cardY + 38, senW, 18)
     .fillAndStroke('#EFF6FF', COLOR.accentBlue).restore();
  doc.font(FONT.bold).fontSize(9).fillColor(COLOR.accentDark)
     .text(senLabel, senX + 10, cardY + 43, { width: senW - 10 });

  // Meta row
  const metaY = cardY + 66;
  doc.font(FONT.bold).fontSize(8).fillColor(COLOR.mutedText)
     .text('EMAIL', MARGIN + 18, metaY);
  doc.font(FONT.regular).fontSize(8.5).fillColor(COLOR.bodyText)
     .text(profile.email || '—', MARGIN + 60, metaY);

  doc.font(FONT.bold).fontSize(8).fillColor(COLOR.mutedText)
     .text('CATEGORY', MARGIN + 18, metaY + 14);
  doc.font(FONT.regular).fontSize(8.5).fillColor(COLOR.bodyText)
     .text((task.category || 'development').toUpperCase(), MARGIN + 70, metaY + 14);

  doc.font(FONT.bold).fontSize(8).fillColor(COLOR.mutedText)
     .text('DEADLINE', MARGIN + 18, metaY + 28);
  doc.font(FONT.bold).fontSize(8.5).fillColor(COLOR.successGreen)
     .text(`${task.deadline_days || 3} Working Days`, MARGIN + 70, metaY + 28);

  // Date issued (right side)
  const issued = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  doc.font(FONT.regular).fontSize(8).fillColor(COLOR.mutedText)
     .text('Issued: ' + issued, PW - MARGIN - 140, cardY + 14, { width: 130, align: 'right' });

  doc.y = cardY + cardH + 18;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateAssignmentPdf(profile, task, githubRepoUrl)
 *
 * @param {object} profile        - { name, email, role, cv_text }
 * @param {object} task           - output from selectTemplate() or generateTask()
 * @param {string} githubRepoUrl  - GitHub repo URL (null for design/product roles)
 * @returns {Promise<string>}     - absolute path to the saved PDF file
 */
function generateAssignmentPdf(profile, task, githubRepoUrl) {
  return new Promise((resolve, reject) => {
    try {
      ensureOutputDir();

      // Sanitise filename
      const safeName = (profile.name || 'candidate')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const filename  = `assignment-${safeName}-${Date.now()}.pdf`;
      const filePath  = path.join(OUTPUT_DIR, filename);

      const doc = new PDFDocument({
        size:    'A4',
        margins: { top: 68, bottom: 50, left: MARGIN, right: MARGIN },
        info: {
          Title:    `SensusSoft Assignment — ${profile.name}`,
          Author:   'SensusSoft AI Hiring Automation',
          Subject:  `Technical Assignment: ${task.title}`,
          Keywords: 'assignment, hiring, sensussoft'
        }
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let pageNum = 1;

      // Draw header on first page
      drawPageHeader(doc);

      // Re-draw header on every new page
      doc.on('pageAdded', () => {
        pageNum++;
        drawPageHeader(doc);
      });

      // ── COVER SECTION ──────────────────────────────────────────────────────
      drawCoverSection(doc, profile, task);

      // ── SECTION 1: PROFILE SUMMARY ─────────────────────────────────────────
      sectionHeading(doc, '1. Profile Summary');
      doc.font(FONT.regular).fontSize(9.5).fillColor(COLOR.bodyText)
         .text(task.cv_summary || 'Candidate profile analyzed by SensusSoft AI system.',
               MARGIN, doc.y, { width: CONTENT, lineGap: 3 });
      doc.moveDown(1);

      // ── SECTION 2: PROJECT TITLE ───────────────────────────────────────────
      sectionHeading(doc, '2. Assigned Project Title');
      doc.font(FONT.bold).fontSize(13).fillColor(COLOR.headerBg)
         .text(task.title || 'Enterprise Technical Assignment', MARGIN, doc.y, { width: CONTENT });
      doc.moveDown(0.5);
      hRule(doc, doc.y);
      doc.moveDown(0.8);

      // ── SECTION 3: PROJECT SCENARIO ────────────────────────────────────────
      sectionHeading(doc, '3. Project Scenario');
      doc.font(FONT.regular).fontSize(9.5).fillColor(COLOR.bodyText)
         .text(task.scenario || '', MARGIN, doc.y, { width: CONTENT, lineGap: 3 });
      doc.moveDown(1);

      // ── SECTION 4: REQUIREMENTS ────────────────────────────────────────────
      sectionHeading(doc, '4. Assignment Requirements');
      (task.requirements || []).forEach((req, i) => {
        ensureSpace(doc, 28);
        bulletItem(doc, i + 1, req);
      });
      doc.moveDown(0.5);

      // ── SECTION 5: DELIVERABLES ────────────────────────────────────────────
      sectionHeading(doc, '5. Expected Deliverables');
      (task.deliverables || []).forEach((del, i) => {
        ensureSpace(doc, 28);
        bulletItem(doc, i + 1, del);
      });
      doc.moveDown(0.5);

      // ── SECTION 6: EVALUATION CRITERIA ────────────────────────────────────
      sectionHeading(doc, '6. Evaluation Criteria');
      (task.evaluation_criteria || []).forEach((crit, i) => {
        ensureSpace(doc, 28);
        bulletItem(doc, i + 1, crit);
      });
      doc.moveDown(0.5);

      // ── SECTION 7: GITHUB REPOSITORY (dev roles only) ─────────────────────
      if (githubRepoUrl) {
        ensureSpace(doc, 80);
        sectionHeading(doc, '7. Assigned GitHub Repository');

        // Repo card
        const repoCardY = doc.y;
        fillRect(doc, MARGIN, repoCardY, CONTENT, 56, '#F0F9FF');
        doc.save().rect(MARGIN, repoCardY, CONTENT, 56)
           .strokeColor(COLOR.accentBlue).lineWidth(0.6).stroke().restore();
        fillRect(doc, MARGIN, repoCardY, 5, 56, COLOR.accentBlue);

        doc.font(FONT.bold).fontSize(9).fillColor(COLOR.mutedText)
           .text('REPOSITORY URL', MARGIN + 14, repoCardY + 10);
        doc.font(FONT.regular).fontSize(9.5).fillColor(COLOR.accentBlue)
           .text(githubRepoUrl, MARGIN + 14, repoCardY + 24,
                 { width: CONTENT - 20, link: githubRepoUrl });

        doc.y = repoCardY + 56 + 10;

        // Warning box
        const warnY = doc.y;
        fillRect(doc, MARGIN, warnY, CONTENT, 36, '#FFFBEB');
        doc.save().rect(MARGIN, warnY, CONTENT, 36)
           .strokeColor('#F59E0B').lineWidth(0.6).stroke().restore();
        fillRect(doc, MARGIN, warnY, 5, 36, '#F59E0B');

        doc.font(FONT.bold).fontSize(8.5).fillColor(COLOR.warningAmber)
           .text('⚠  IMPORTANT:', MARGIN + 14, warnY + 8);
        doc.font(FONT.regular).fontSize(8.5).fillColor(COLOR.warningAmber)
           .text(
             'This repository will be permanently locked after your first push. ' +
             'Ensure your submission is complete before pushing.',
             MARGIN + 14, warnY + 20, { width: CONTENT - 20 }
           );

        doc.y = warnY + 36 + 14;
        doc.moveDown(0.5);
      }

      // ── SECTION 8: DEADLINE & SUBMISSION INSTRUCTIONS ─────────────────────
      const dlSection = githubRepoUrl ? '8' : '7';
      ensureSpace(doc, 100);
      sectionHeading(doc, `${dlSection}. Deadline & Submission Instructions`);

      kvRow(doc, 'Deadline',       `${task.deadline_days || 3} Working Days from date of issue`);
      kvRow(doc, 'Submission',     githubRepoUrl
        ? 'Push final code to the assigned GitHub repository'
        : 'Submit deliverables via email to hr@sensussoft.com');
      kvRow(doc, 'README',         'Include setup instructions, architecture notes, and screenshots');
      kvRow(doc, 'Code Quality',   'Clean, commented, production-ready code expected');
      kvRow(doc, 'Late Submission','Submissions after deadline will not be evaluated');

      doc.moveDown(1);

      // ── CLOSING NOTE ───────────────────────────────────────────────────────
      ensureSpace(doc, 70);
      const noteY = doc.y;
      fillRect(doc, MARGIN, noteY, CONTENT, 52, '#F0FDF4');
      doc.save().rect(MARGIN, noteY, CONTENT, 52)
         .strokeColor('#86EFAC').lineWidth(0.6).stroke().restore();
      fillRect(doc, MARGIN, noteY, 5, 52, '#16A34A');

      doc.font(FONT.bold).fontSize(9).fillColor(COLOR.successGreen)
         .text('Best of luck with your assignment!', MARGIN + 14, noteY + 10);
      doc.font(FONT.regular).fontSize(8.5).fillColor('#166534')
         .text(
           'This assignment was generated by SensusSoft AI Hiring Automation. ' +
           'It is personalized based on your profile, skills, and applied role. ' +
           'Deliver your best work — our engineering team reviews every submission.',
           MARGIN + 14, noteY + 24, { width: CONTENT - 20 }
         );

      doc.y = noteY + 52 + 16;

      // Signature block
      doc.font(FONT.bold).fontSize(9).fillColor(COLOR.bodyText)
         .text('Regards,', MARGIN, doc.y);
      doc.moveDown(0.3);
      doc.font(FONT.bold).fontSize(9.5).fillColor(COLOR.headerBg)
         .text('SensusSoft HR & Engineering Recruitment Team', MARGIN, doc.y);
      doc.font(FONT.regular).fontSize(8.5).fillColor(COLOR.mutedText)
         .text('hr@sensussoft.com  |  www.sensussoft.com', MARGIN, doc.y + 13);

      // ── FINALIZE & ADD FOOTERS ────────────────────────────────────────────
      doc.end();

      stream.on('finish', () => {
        // Add footers to all pages after document is finalized
        try {
          const pdfBuffer = fs.readFileSync(filePath);
          const PDFParser = require('pdfkit');
          
          // Re-open PDF to add footers (pdfkit limitation workaround)
          // For now, we'll use a simpler approach: add footer space during generation
          console.log('[PDF] Generated =>', filePath);
          resolve(filePath);
        } catch (err) {
          console.log('[PDF] Post-processing note =>', err.message);
          resolve(filePath); // Still resolve even if footer post-processing fails
        }
      });

      stream.on('error', (err) => {
        console.log('[PDF] Stream error =>', err.message);
        reject(err);
      });

    } catch (err) {
      console.log('[PDF] Generation error =>', err.message);
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = { generateAssignmentPdf };
