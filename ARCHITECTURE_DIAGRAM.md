# Brain.js Integration Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SensusSoft AI Hiring Automation                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              Frontend / Client                               │
│                    (Career Application Form - index.html)                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ POST /api/career-apply
                                      │ (name, email, role, resume)
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Express Server (server.js)                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 1. Parse request (name, email, role, skills)                          │ │
│  │ 2. Check if role needs GitHub repo                                    │ │
│  │ 3. Create GitHub repo (if dev role)                                   │ │
│  │ 4. Build profile object                                               │ │
│  │ 5. Call processCandidate(profile, githubRepoUrl)                      │ │
│  │ 6. Log to audit trail                                                 │ │
│  │ 7. Return response                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ processCandidate(profile, githubRepoUrl)
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Brain.js - Core Processing Engine                         │
│                                                                              │
│  ┌─ STEP 1: Role Mismatch Detection ────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  detectMismatch(profile)                                            │  │
│  │  ├─ Analyze role keywords                                           │  │
│  │  ├─ Analyze CV keywords                                             │  │
│  │  └─ Check alignment                                                 │  │
│  │                                                                      │  │
│  │  IF MISMATCH:                                                        │  │
│  │  ├─ renderMismatchEmail(task)                                       │  │
│  │  ├─ transporter.sendMail()                                          │  │
│  │  └─ RETURN (stop processing)                                        │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─ STEP 2: Task Generation ────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  generateTask(profile)                                              │  │
│  │  │                                                                  │  │
│  │  ├─ TRY: callOpenRouter(buildPrompt(profile))                       │  │
│  │  │   ├─ Send prompt to OpenRouter AI                               │  │
│  │  │   ├─ Parse JSON response                                        │  │
│  │  │   ├─ Validate required fields                                   │  │
│  │  │   └─ RETURN task (if success)                                   │  │
│  │  │                                                                  │  │
│  │  └─ FALLBACK: selectTemplate(profile)                              │  │
│  │      ├─ detectCategory(profile)                                    │  │
│  │      │  └─ Analyze role + CV keywords                              │  │
│  │      │     └─ Return: react|nextjs|node|fullstack|uiux|qa|devops   │  │
│  │      │                |android|python|product                      │  │
│  │      │                                                              │  │
│  │      ├─ detectSeniority(profile)                                   │  │
│  │      │  └─ Return: junior|mid|senior                               │  │
│  │      │                                                              │  │
│  │      ├─ Get template from TEMPLATES library                        │  │
│  │      ├─ applySeniority(template, seniority)                        │  │
│  │      └─ RETURN task                                                │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─ STEP 3: PDF Generation ─────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  generateAssignmentPdf(profile, task, githubRepoUrl)                │  │
│  │  │                                                                  │  │
│  │  ├─ Create PDFDocument                                              │  │
│  │  ├─ Draw page header (company branding)                             │  │
│  │  ├─ Draw cover section (candidate info)                             │  │
│  │  ├─ Draw 8 content sections:                                        │  │
│  │  │  1. Profile Summary                                              │  │
│  │  │  2. Project Title                                                │  │
│  │  │  3. Project Scenario                                             │  │
│  │  │  4. Requirements (numbered)                                      │  │
│  │  │  5. Deliverables (numbered)                                      │  │
│  │  │  6. Evaluation Criteria (numbered)                               │  │
│  │  │  7. GitHub Repo (if applicable)                                  │  │
│  │  │  8. Deadline & Submission Instructions                           │  │
│  │  ├─ Draw closing note                                               │  │
│  │  ├─ Draw page footer (page numbers)                                 │  │
│  │  ├─ Save to: generated-pdfs/assignment-{name}-{timestamp}.pdf       │  │
│  │  └─ RETURN pdfPath                                                  │  │
│  │                                                                      │  │
│  │  ERROR HANDLING: Non-fatal (continue to email)                      │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─ STEP 4: Email Delivery ─────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  renderAssignmentEmail(profile, task, githubRepoUrl)                │  │
│  │  └─ Generate HTML email with:                                       │  │
│  │     ├─ Personalized greeting                                        │  │
│  │     ├─ Assignment title & scenario                                  │  │
│  │     ├─ Profile analysis                                             │  │
│  │     ├─ Requirements list                                            │  │
│  │     ├─ Deliverables list                                            │  │
│  │     ├─ Evaluation criteria                                          │  │
│  │     ├─ GitHub repo link (if applicable)                             │  │
│  │     ├─ Deadline                                                     │  │
│  │     └─ Professional signature                                       │  │
│  │                                                                      │  │
│  │  Build mailOptions:                                                 │  │
│  │  ├─ from: SMTP_EMAIL                                                │  │
│  │  ├─ to: profile.email                                               │  │
│  │  ├─ subject: SensusSoft Assignment — {role}                         │  │
│  │  ├─ html: renderAssignmentEmail(...)                                │  │
│  │  └─ attachments: [{ filename, path: pdfPath }] (if PDF exists)      │  │
│  │                                                                      │  │
│  │  transporter.sendMail(mailOptions)                                  │  │
│  │  └─ Send email via Gmail SMTP                                       │  │
│  │                                                                      │  │
│  │  RETURN task                                                        │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Candidate Receives Email                             │
│                                                                              │
│  ├─ HTML email with assignment details                                      │
│  ├─ PDF attachment (professional assignment document)                       │
│  ├─ GitHub repo link (if dev role)                                          │
│  └─ Deadline information                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Candidate Completes Assignment                            │
│                                                                              │
│  ├─ Dev roles: Push code to GitHub repo                                     │
│  ├─ Design roles: Submit Figma/design files via email                       │
│  ├─ QA roles: Submit test cases via email                                   │
│  └─ Product roles: Submit PRD via email                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    GitHub Webhook Handler (optional)                         │
│                                                                              │
│  ├─ Receives push event from GitHub                                         │
│  ├─ Evaluates submission                                                    │
│  ├─ Sends evaluation email to HR                                            │
│  └─ Locks repository                                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              server.js                                      │
│                         (Express Server)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │  githubService   │  │   brain.js       │  │ githubWebhook    │
        │  (createRepo)    │  │ (processCandidate)  │ Handler          │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ taskTemplates.js │  │assignmentPdf     │  │ nodemailer       │
        │                  │  │Generator.js      │  │ (email sending)  │
        │ - selectTemplate │  │                  │  │                  │
        │ - detectCategory │  │ - generateAssign │  │ - transporter    │
        │ - detectSeniority│  │   mentPdf()      │  │ - sendMail()     │
        │ - TEMPLATES lib  │  │ - drawPageHeader │  │                  │
        │                  │  │ - drawCoverSect  │  │                  │
        │ 10+ role         │  │ - sectionHeading │  │                  │
        │ templates        │  │ - bulletItem     │  │                  │
        │                  │  │ - kvRow          │  │                  │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │   pdfkit         │
                            │ (PDF generation) │
                            └──────────────────┘
```

---

## Data Flow Sequence Diagram

```
Candidate                Server              Brain.js            PDF Gen         Email
    │                      │                    │                   │              │
    │ POST /api/career-apply
    ├─────────────────────>│                    │                   │              │
    │                      │ Create GitHub repo │                   │              │
    │                      ├──────────────────>│                    │              │
    │                      │<──────────────────┤                    │              │
    │                      │ processCandidate()│                    │              │
    │                      ├───────────────────>│                   │              │
    │                      │                    │ detectMismatch()  │              │
    │                      │                    │ (check role/CV)   │              │
    │                      │                    │                   │              │
    │                      │                    │ generateTask()    │              │
    │                      │                    │ (AI or template)  │              │
    │                      │                    │                   │              │
    │                      │                    │ generateAssignmentPdf()
    │                      │                    ├──────────────────>│              │
    │                      │                    │<──────────────────┤              │
    │                      │                    │ (pdfPath)         │              │
    │                      │                    │                   │              │
    │                      │                    │ renderAssignmentEmail()
    │                      │                    │ (build HTML)      │              │
    │                      │                    │                   │              │
    │                      │                    │ sendMail()        │              │
    │                      │                    ├──────────────────────────────────>│
    │                      │                    │                   │              │
    │                      │<───────────────────┤                   │              │
    │                      │ (task object)      │                   │              │
    │<─────────────────────┤                    │                   │              │
    │ (201 response)       │                    │                   │              │
    │                      │                    │                   │              │
    │                      │                    │                   │              │ Email sent
    │                      │                    │                   │              │ with PDF
    │                      │                    │                   │              │
```

---

## Error Handling Flow

```
processCandidate(profile, githubRepoUrl)
    │
    ├─ detectMismatch(profile)
    │   ├─ YES: Send mismatch email → RETURN
    │   └─ NO: Continue
    │
    ├─ generateTask(profile)
    │   ├─ TRY: callOpenRouter()
    │   │   ├─ SUCCESS: Return task
    │   │   └─ FAIL: Continue to fallback
    │   │
    │   └─ FALLBACK: selectTemplate()
    │       └─ Return template (always succeeds)
    │
    ├─ generateAssignmentPdf()
    │   ├─ SUCCESS: pdfPath = filePath
    │   └─ FAIL: pdfPath = null (non-fatal)
    │       └─ Log error, continue
    │
    ├─ renderAssignmentEmail()
    │   └─ Always succeeds (HTML generation)
    │
    ├─ transporter.sendMail()
    │   ├─ SUCCESS: Email sent
    │   └─ FAIL: Log error (non-fatal)
    │
    └─ RETURN task
```

---

## Task Template Selection Logic

```
selectTemplate(profile)
    │
    ├─ detectCategory(profile)
    │   ├─ Score keywords for each category
    │   ├─ Return highest scoring category
    │   └─ Fallback to 'fullstack' if no match
    │
    ├─ detectSeniority(profile)
    │   ├─ Check for 'senior', 'lead', 'architect' → 'senior'
    │   ├─ Check for 'junior', 'fresher', 'intern' → 'junior'
    │   └─ Default → 'mid'
    │
    ├─ Get template from TEMPLATES[category]
    │
    └─ applySeniority(template, seniority)
        ├─ Adjust title for senior
        ├─ Adjust scenario for senior/junior
        ├─ Trim requirements for junior
        └─ Return adjusted template
```

---

## PDF Generation Structure

```
generateAssignmentPdf(profile, task, githubRepoUrl)
    │
    ├─ ensureOutputDir()
    │   └─ Create webhook-server/generated-pdfs/ if needed
    │
    ├─ Create PDFDocument
    │   ├─ Size: A4
    │   ├─ Margins: 50px
    │   └─ Metadata: Title, Author, Subject, Keywords
    │
    ├─ drawPageHeader()
    │   ├─ Navy background band
    │   ├─ Company name & tagline
    │   └─ "TECHNICAL ASSIGNMENT" label
    │
    ├─ drawCoverSection()
    │   ├─ Candidate name (large)
    │   ├─ Role badge (blue)
    │   ├─ Seniority badge (light blue)
    │   ├─ Email, Category, Deadline
    │   └─ Issue date
    │
    ├─ sectionHeading("1. Profile Summary")
    │   └─ task.cv_summary
    │
    ├─ sectionHeading("2. Assigned Project Title")
    │   └─ task.title
    │
    ├─ sectionHeading("3. Project Scenario")
    │   └─ task.scenario
    │
    ├─ sectionHeading("4. Assignment Requirements")
    │   └─ task.requirements[] (numbered bullets)
    │
    ├─ sectionHeading("5. Expected Deliverables")
    │   └─ task.deliverables[] (numbered bullets)
    │
    ├─ sectionHeading("6. Evaluation Criteria")
    │   └─ task.evaluation_criteria[] (numbered bullets)
    │
    ├─ IF githubRepoUrl:
    │   ├─ sectionHeading("7. Assigned GitHub Repository")
    │   ├─ Repo card with URL (clickable link)
    │   └─ Warning box (yellow)
    │
    ├─ sectionHeading("8. Deadline & Submission Instructions")
    │   ├─ Deadline: {deadline_days} working days
    │   ├─ Submission method (GitHub or email)
    │   ├─ README requirements
    │   ├─ Code quality expectations
    │   └─ Late submission policy
    │
    ├─ Closing note (green box)
    │   └─ Encouragement message
    │
    ├─ Signature block
    │   ├─ "Regards,"
    │   ├─ "SensusSoft HR & Engineering Recruitment Team"
    │   └─ "hr@sensussoft.com | www.sensussoft.com"
    │
    ├─ drawPageFooter() (on all pages)
    │   ├─ Company name & confidentiality notice
    │   └─ Page number
    │
    └─ Save to: generated-pdfs/assignment-{name}-{timestamp}.pdf
```

---

## Email Structure

```
renderAssignmentEmail(profile, task, githubRepoUrl)
    │
    ├─ Header
    │   └─ "SensusSoft Personalized Technical Assignment"
    │
    ├─ Greeting
    │   └─ "Hello {name},"
    │
    ├─ Introduction
    │   ├─ Thank you for applying
    │   ├─ Role: {role}
    │   └─ "Please find the full assignment documentation attached as a PDF."
    │
    ├─ Assignment Title
    │   └─ task.title
    │
    ├─ Scenario
    │   └─ task.scenario
    │
    ├─ Profile Analysis Summary
    │   └─ task.cv_summary
    │
    ├─ Assignment Requirements
    │   └─ task.requirements[] (HTML list)
    │
    ├─ Expected Deliverables
    │   └─ task.deliverables[] (HTML list)
    │
    ├─ Evaluation Criteria
    │   └─ task.evaluation_criteria[] (HTML list)
    │
    ├─ IF githubRepoUrl:
    │   ├─ Assigned GitHub Repository
    │   ├─ Clickable link to repo
    │   └─ Warning: "Repository will be permanently locked after first push"
    │
    ├─ Deadline
    │   └─ "{deadline_days} Working Days"
    │
    └─ Closing
        ├─ "Regards,"
        └─ "SensusSoft HR & Engineering Team"
```

---

## Integration Points Summary

| Component | Integration | Status |
|-----------|-------------|--------|
| taskTemplates.js | `selectTemplate()` called in `generateTask()` | ✅ |
| assignmentPdfGenerator.js | `generateAssignmentPdf()` called in `processCandidate()` | ✅ |
| PDF attachment | Conditional attachment in email | ✅ |
| GitHub repo support | Passed to PDF and email renderers | ✅ |
| Role mismatch validation | `detectMismatch()` at start of `processCandidate()` | ✅ |
| Existing functionality | All preserved, no breaking changes | ✅ |

---

## Performance Characteristics

```
processCandidate() execution timeline:

0ms   ├─ detectMismatch()                    ~10ms
10ms  ├─ generateTask()                      ~2000-5000ms
      │  ├─ callOpenRouter()                 ~2000-5000ms (or)
      │  └─ selectTemplate()                 ~50ms
5010ms├─ generateAssignmentPdf()             ~1000-2000ms
7010ms├─ renderAssignmentEmail()             ~50ms
7060ms├─ transporter.sendMail()              ~1000-3000ms
10060ms└─ RETURN task

Total: ~4-10 seconds per candidate
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Production Environment                              │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Vercel / Railway / Render                                            │  │
│  │                                                                      │  │
│  │  ├─ server.js (Express)                                              │  │
│  │  ├─ brain.js (Processing)                                            │  │
│  │  ├─ taskTemplates.js (Templates)                                     │  │
│  │  ├─ assignmentPdfGenerator.js (PDF)                                  │  │
│  │  ├─ generated-pdfs/ (PDF storage)                                    │  │
│  │  └─ .env (Environment variables)                                     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ External Services                                                    │  │
│  │                                                                      │  │
│  │  ├─ OpenRouter API (AI task generation)                              │  │
│  │  ├─ Gmail SMTP (Email delivery)                                      │  │
│  │  ├─ GitHub API (Repository creation)                                 │  │
│  │  └─ GitHub Webhooks (Submission evaluation)                          │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Data Storage                                                         │  │
│  │                                                                      │  │
│  │  ├─ generated-pdfs/ (PDF files)                                      │  │
│  │  ├─ audit-logs/ (Candidate submissions)                              │  │
│  │  └─ GitHub repositories (Candidate code)                             │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

