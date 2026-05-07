# Brain.js Integration Quick Reference

## Overview
`webhook-server/brain.js` is the core processing engine that orchestrates the entire candidate assignment workflow.

---

## Main Export Function

### `processCandidate(profile, githubRepoUrl)`

**Called by:** `server.js` (POST /api/career-apply)

**Parameters:**
```javascript
profile = {
  name: string,        // Candidate name
  email: string,       // Candidate email
  role: string,        // Applied role (e.g., "React Developer")
  cv_text: string      // Resume/skills text
}

githubRepoUrl = string | null  // GitHub repo URL (null for design/product roles)
```

**Returns:**
```javascript
task = {
  category: string,              // 'development' | 'design' | 'qa' | 'devops' | 'product'
  title: string,                 // Assignment title
  scenario: string,              // Project scenario
  requirements: string[],        // List of requirements
  deliverables: string[],        // List of deliverables
  evaluation_criteria: string[], // Evaluation criteria
  deadline_days: number,         // Deadline in working days
  cv_summary: string,            // AI-generated profile summary
  detected_seniority: string     // 'junior' | 'mid' | 'senior'
}
```

---

## Processing Steps

### 1️⃣ Role Mismatch Detection
```javascript
if (detectMismatch(profile)) {
  // Send rejection email
  // Return mismatch task
}
```

**Detects:**
- Designer applying for Developer role
- Developer applying for Designer role
- Misaligned role and CV skills

**Action:** Sends rejection email, stops processing

---

### 2️⃣ Task Generation
```javascript
const task = await generateTask(profile);
```

**Strategy:**
1. Try OpenRouter AI API
2. If AI fails → Use `selectTemplate(profile)`

**Template Selection:**
- Analyzes role and CV keywords
- Detects category (react, node, uiux, qa, devops, etc.)
- Detects seniority (junior, mid, senior)
- Returns enterprise-grade template

---

### 3️⃣ PDF Generation
```javascript
const pdfPath = await generateAssignmentPdf(profile, task, githubRepoUrl);
```

**Output:** `webhook-server/generated-pdfs/assignment-{name}-{timestamp}.pdf`

**Features:**
- Professional enterprise design
- 8 sections with full assignment details
- GitHub repo link (if applicable)
- Metadata and document properties

**Error Handling:** Non-fatal (email still sends)

---

### 4️⃣ Email Delivery
```javascript
await transporter.sendMail({
  from: process.env.SMTP_EMAIL,
  to: profile.email,
  subject: `SensusSoft Assignment — ${profile.role}`,
  html: renderAssignmentEmail(profile, task, githubRepoUrl),
  attachments: pdfPath ? [{ filename: '...', path: pdfPath }] : []
});
```

**Email Includes:**
- Personalized greeting
- Full assignment details
- GitHub repo link (if applicable)
- PDF attachment (if generated)

---

## Key Functions

### `detectMismatch(profile)`
Checks if role and CV skills align.

**Returns:** `boolean`

**Example:**
```javascript
detectMismatch({
  role: 'React Developer',
  cv_text: 'Figma, Adobe XD, UI/UX Design'
}) // → true (mismatch)
```

---

### `generateTask(profile)`
Generates personalized assignment.

**Returns:** `Promise<task>`

**Flow:**
1. Call OpenRouter AI
2. Parse JSON response
3. Validate required fields
4. If any step fails → Use template fallback

---

### `selectTemplate(profile)` (from taskTemplates.js)
Selects enterprise template based on profile.

**Returns:** `task`

**Supported Categories:**
- `react` - React SaaS Dashboard
- `nextjs` - Next.js Content Platform
- `node` - Node.js REST API
- `fullstack` - Full Stack Recruitment Platform
- `uiux` - FinTech Mobile Banking Design
- `qa` - QA Automation Framework
- `devops` - CI/CD Infrastructure
- `android` - Cross-Platform Mobile App
- `python` - ML-Powered Analytics API
- `product` - Product Requirements Document

---

### `generateAssignmentPdf(profile, task, githubRepoUrl)` (from assignmentPdfGenerator.js)
Generates professional PDF assignment.

**Returns:** `Promise<string>` (file path)

**PDF Sections:**
1. Header with company branding
2. Candidate info card
3. Profile summary
4. Project title
5. Project scenario
6. Requirements (numbered)
7. Deliverables (numbered)
8. Evaluation criteria (numbered)
9. GitHub repo (if applicable)
10. Deadline & submission instructions
11. Closing note
12. Footer with page numbers

---

### `renderAssignmentEmail(profile, task, githubRepoUrl)`
Generates HTML email content.

**Returns:** `string` (HTML)

**Includes:**
- Personalized greeting
- Assignment title and scenario
- Profile analysis
- Requirements list
- Deliverables list
- Evaluation criteria
- GitHub repo link (if applicable)
- Deadline
- Professional signature

---

### `renderMismatchEmail(task)`
Generates rejection email for mismatched candidates.

**Returns:** `string` (HTML)

**Message:** Role doesn't match technical background

---

## Integration with Other Modules

### taskTemplates.js
```javascript
const { selectTemplate, detectCategory, detectSeniority } = require('./taskTemplates');

// Used in generateTask() as fallback
const template = selectTemplate(profile);
```

**Exports:**
- `selectTemplate(profile)` - Main function
- `detectCategory(profile)` - Category detection
- `detectSeniority(profile)` - Seniority detection
- `getAvailableCategories()` - List of supported categories

---

### assignmentPdfGenerator.js
```javascript
const { generateAssignmentPdf } = require('./assignmentPdfGenerator');

// Used in processCandidate()
const pdfPath = await generateAssignmentPdf(profile, task, githubRepoUrl);
```

**Exports:**
- `generateAssignmentPdf(profile, task, githubRepoUrl)` - Main function

---

### server.js
```javascript
const { processCandidate } = require('./brain');

// Called after GitHub repo creation
const task = await processCandidate(profile, githubRepoUrl);
```

**Flow:**
1. Create GitHub repo (if dev role)
2. Call `processCandidate()`
3. Log to audit trail
4. Return task details

---

## Environment Variables

```bash
# OpenRouter AI
OPENROUTER_API_KEY=sk-...

# Gmail SMTP
SMTP_EMAIL=your-email@gmail.com
SMTP_PASS=your-app-password

# GitHub
GITHUB_TOKEN=ghp_...
```

---

## Error Handling

### AI Generation Failure
```javascript
try {
  const task = await callOpenRouter(prompt);
} catch (err) {
  // Fall back to template
  const template = selectTemplate(profile);
}
```

### PDF Generation Failure
```javascript
try {
  pdfPath = await generateAssignmentPdf(...);
} catch (pdfErr) {
  // Non-fatal: email still sends
  console.log('[Brain] PDF generation failed (non-fatal)');
}
```

### Email Failure
```javascript
try {
  await transporter.sendMail(mailOptions);
} catch (mailErr) {
  console.log('[Brain] Assignment email failed');
  // Error logged but doesn't stop processing
}
```

---

## Logging

All operations log with `[Brain]` prefix:

```
[Brain] Trying model => openai/gpt-3.5-turbo
[Brain] OpenRouter model used => openai/gpt-3.5-turbo
[Brain] Role mismatch detected for => John Doe
[Brain] Mismatch email sent => john@example.com
[Brain] Template selected => Enterprise React SaaS Analytics Dashboard
[Brain] PDF generated => /path/to/assignment-john-doe-1234567890.pdf
[Brain] Assignment email sent => john@example.com
```

---

## Testing

### Test Role Mismatch
```javascript
const profile = {
  name: 'Jane Designer',
  email: 'jane@example.com',
  role: 'React Developer',
  cv_text: 'Figma, Adobe XD, UI/UX Design'
};

const task = await processCandidate(profile, null);
// Should send mismatch email
```

### Test Task Generation
```javascript
const profile = {
  name: 'John Developer',
  email: 'john@example.com',
  role: 'React Developer',
  cv_text: 'React, Node.js, MongoDB, Express'
};

const task = await processCandidate(profile, 'https://github.com/...');
// Should generate task and send email with PDF
```

### Test PDF Generation
```javascript
const { generateAssignmentPdf } = require('./assignmentPdfGenerator');

const pdfPath = await generateAssignmentPdf(profile, task, githubRepoUrl);
console.log('PDF saved to:', pdfPath);
```

---

## Troubleshooting

### PDF not attached to email
- Check if `generateAssignmentPdf()` succeeded
- Verify `pdfPath` is not null
- Check file exists at path

### Email not sent
- Verify `SMTP_EMAIL` and `SMTP_PASS` in .env
- Check Gmail app password (not regular password)
- Verify email address is valid

### AI task generation fails
- Check `OPENROUTER_API_KEY` in .env
- Verify API key is valid
- Check internet connection
- Template fallback should activate

### Role mismatch not detected
- Check `detectMismatch()` logic
- Verify keywords in `CATEGORY_SIGNALS`
- Add more keywords if needed

---

## Performance Notes

- **AI Generation:** ~2-5 seconds (with fallback)
- **PDF Generation:** ~1-2 seconds
- **Email Sending:** ~1-3 seconds
- **Total:** ~4-10 seconds per candidate

---

## Security Notes

- ✅ PDF files saved with timestamp to prevent collisions
- ✅ Email addresses validated before sending
- ✅ GitHub repo URLs included only for dev roles
- ✅ No sensitive data in logs
- ✅ Error messages don't expose system details

---

## Future Enhancements

- [ ] Add email template customization
- [ ] Support multiple PDF formats
- [ ] Add candidate feedback collection
- [ ] Implement assignment versioning
- [ ] Add submission tracking dashboard
- [ ] Support multiple languages
- [ ] Add SMS notifications
- [ ] Implement assignment scheduling

---

## Support

For issues or questions:
1. Check logs with `[Brain]` prefix
2. Verify environment variables
3. Test individual functions
4. Check module dependencies
5. Review error messages

