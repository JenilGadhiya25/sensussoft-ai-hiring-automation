# SensusSoft AI Hiring Automation — Complete Project Documentation

---

## Project Overview

**SensusSoft AI Hiring Automation** is a fully automated technical hiring system.  
Jyare koi candidate career form submit kare, system automatically:

1. Resume / skills validate kare
2. AI thi unique enterprise assignment generate kare
3. GitHub repository create kare (dev roles mate)
4. Assignment PDF generate kare
5. Candidate ne email kare PDF attachment sathe
6. Candidate jyare code push kare, auto-evaluate kare
7. HR ne evaluation report email kare
8. Repository permanently lock kari de

---

## System Architecture

```
Candidate Form (index.html)
        |
        | POST /api/career-apply
        v
  server.js (Express API)
        |
        |-- Role needs GitHub? --> githubService.js --> GitHub API
        |                              |
        |                         Create Repo
        |                         Add README.md + TASK.md
        |                         Attach Webhook
        |
        |-- processCandidate() --> brain.js
                |
                |-- detectMismatch() --> Role vs Skills check
                |       |
                |       YES --> Send mismatch email --> STOP
                |       NO  --> Continue
                |
                |-- generateTask() --> OpenRouter AI
                |       |
                |       AI Success --> Unique assignment
                |       AI Fail    --> taskTemplates.js fallback
                |
                |-- generateAssignmentPdf() --> assignmentPdfGenerator.js
                |
                |-- Send email to candidate (PDF attached)
                |
                v
          Candidate receives assignment email

Candidate pushes code to GitHub
        |
        | GitHub Webhook fires
        v
  githubWebhookHandler.js
        |
        |-- githubAutoEvaluator.js --> Evaluate submission
        |       |
        |       Check: README, TASK.md, source files, deployment proof
        |       Calculate score (0-100)
        |       Generate evaluation PDF
        |
        |-- hrEvaluationMailer.js --> Email HR with score + PDF
        |
        |-- lockRepoAfterSubmission() --> Permanently lock GitHub repo
```

---

## File Structure

```
project-root/
|
|-- index.html                          # Career application form (frontend)
|-- package.json                        # Node.js dependencies
|-- vercel.json                         # Vercel deployment config
|
|-- webhook-server/
|   |-- server.js                       # Main Express server
|   |-- brain.js                        # Core AI processing engine
|   |-- taskTemplates.js                # Fallback task template library
|   |-- assignmentPdfGenerator.js       # PDF generation (pdfkit)
|   |-- githubWebhookHandler.js         # GitHub push event handler
|   |-- githubAutoEvaluator.js          # Auto-evaluate candidate submission
|   |-- hrEvaluationMailer.js           # Send evaluation report to HR
|   |-- .env                            # Environment variables (secret)
|   |-- .env.example                    # Environment variables template
|   |-- generated-pdfs/                 # Generated assignment PDFs
|
|-- github-demo/
|   |-- githubService.js                # GitHub API integration
|
|-- audit-logs/
|   |-- candidate-log.json              # All submissions audit trail
|
|-- api/
|   |-- index.js                        # Vercel serverless entry point
```

---

## Environment Variables (.env)

```env
PORT=4000
AUDIT_LOG_PATH=../audit-logs/candidate-log.json

# OpenRouter AI (for assignment generation)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx

# GitHub (for repo creation and locking)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
GITHUB_USER=your-github-username

# Gmail SMTP (for sending emails)
SMTP_EMAIL=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

# HR Email (receives evaluation reports)
HR_EMAIL=hr@sensussoft.com
```

---

## How Each File Works

---

### 1. index.html — Career Application Form

**Shu kare chhe:**
- Candidate nu career application form
- Fields: Full Name, Email, Applied Role, Skills/Resume text
- Form submit thay tyare POST /api/career-apply ne call kare

**Key Points:**
- Frontend only — koi backend logic nathi
- Skills field ma candidate potano resume / skills paste kare
- Role dropdown ma available roles list hoy

---

### 2. server.js — Main Express Server

**Shu kare chhe:**
- Express.js server run kare port 4000 par
- API endpoints handle kare
- CORS enable kare (any origin)
- Multer thi file upload handle kare (resume PDF, max 5MB)

**Main Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check — "SensusSoft AI Hiring Automation Running" |
| `/api/career-apply` | POST | Main application submission endpoint |
| `/api/github-submission-webhook` | POST | GitHub push event receiver |

**`/api/career-apply` Flow:**
```
1. Request body parse karo (fullName, email, appliedRole, skills)
2. Validate required fields
3. needsGithubRepo(role) check karo
   - YES: githubService.createRepo() call karo
   - NO:  githubRepoUrl = null
4. processCandidate(profile, githubRepoUrl) call karo
5. writeAuditLog() — submission record karo
6. Response return karo
```

**`needsGithubRepo()` — Roles that get GitHub repo:**
- developer, engineer, frontend, backend, full stack, mern, qa, tester, devops

**Audit Log Format:**
```json
{
  "submittedAt": "2025-01-01T10:00:00.000Z",
  "fullName": "John Doe",
  "email": "john@example.com",
  "appliedRole": "React Developer",
  "githubRepoUrl": "https://github.com/user/repo",
  "taskTitle": "AI-Powered FinTech Dashboard",
  "category": "development",
  "seniority": "mid"
}
```

---

### 3. brain.js — Core AI Processing Engine

**Shu kare chhe:**
- Puro hiring automation logic yahan chhe
- Role mismatch validate kare
- AI thi unique assignment generate kare
- PDF generate kare
- Candidate ne email kare

**Functions:**

#### `detectMismatch(profile)` — Strict Role vs Skill Validator

**Rules:**

| Role Type | Resume Must Have | Mismatch If |
|-----------|-----------------|-------------|
| UI/UX Designer | figma, adobe xd, wireframe, ux, ui design | Only dev skills (React, Node, etc.) |
| React/Node/Dev/Engineer | react, javascript, node, api, backend, etc. | Only design skills (Figma, wireframes) |
| QA/Tester | cypress, selenium, testing, jest, etc. | Only design skills |
| DevOps/Cloud | docker, kubernetes, aws, ci/cd, etc. | Only design skills |
| Product Manager | roadmap, agile, prd, user stories, etc. | No relevant skills at all |

**Returns:** `{ mismatch: boolean, reason: string }`

**Example:**
```
Role: "React Developer"
CV: "Figma, Adobe XD, wireframes, prototypes"
Result: { mismatch: true, reason: "You applied for Developer role but resume has only design skills..." }
```

#### `buildPrompt(profile)` — AI Prompt Builder

**Shu kare chhe:**
- Candidate nu full profile AI ne moke chhe
- AI ne instruct kare ke completely unique enterprise project invent kare
- Domain ideas provide kare: FinTech, Healthcare, EdTech, Crypto, etc.
- Rules specify kare: unique title, real scenario, actual tech stack use karo

**Temperature: 0.85** — High creativity for unique output

#### `generateTask(profile)` — Task Generator

**Flow:**
```
1. callOpenRouter(buildPrompt(profile)) — AI call
2. extractJSON(raw) — AI response parse karo
3. isValidTask(parsed) — validate karo
   - Valid: return AI task
   - Invalid: fallback to taskTemplates.js
4. selectTemplate(profile) — fallback
```

#### `processCandidate(profile, githubRepoUrl)` — Main Function

**Complete Flow:**
```
1. detectMismatch() — role vs skills check
   - Mismatch: send mismatch email, return early (NO task, NO PDF, NO repo)
   
2. generateTask() — AI unique assignment
   - AI success: unique enterprise project
   - AI fail: taskTemplates.js fallback
   
3. generateAssignmentPdf() — PDF banavo
   - Success: pdfPath set
   - Fail: non-fatal, email without PDF
   
4. Send email to candidate
   - HTML email with full assignment
   - PDF attachment (if generated)
   - GitHub repo link (if applicable)
```

---

### 4. taskTemplates.js — Fallback Task Library

**Shu kare chhe:**
- Jyare AI fail thay tyare use thay
- CV thi technologies detect kare
- Experience level detect kare
- Technology-specific unique assignment return kare

**`detectTechnologies(profile)`:**
- CV text scan kare
- 30+ technology keywords check kare
- Returns: `{ react: true, firebase: true, mongodb: false, ... }`

**`detectCategory(profile)`:**
- Role + CV keywords score kare
- Best matching category return kare
- Categories: react, nextjs, node, fullstack, uiux, qa, devops, android, python, product

**`detectExperience(profile)`:**
- CV ma "X years experience" pattern search kare
- Keywords: senior, lead, architect, junior, fresher, intern
- Returns: "junior" | "mid" | "senior"

**Dynamic Assignment Selection:**

| Candidate Profile | Assignment Given |
|------------------|-----------------|
| React + Firebase | Real-Time Collaborative Task Management |
| React + OpenAI + Next.js | AI-Powered Analytics Dashboard |
| React + Stripe + Ecommerce | Enterprise E-Commerce Platform |
| Node.js + MongoDB | MongoDB Microservice Platform |
| Node.js + GraphQL | GraphQL API Server |
| Node.js + Docker/K8s | Containerized Microservice |
| UI/UX + FinTech background | FinTech Mobile Banking Design |
| UI/UX + Ecommerce background | E-Commerce App Design |
| QA + Cypress/Playwright | E2E Automation Framework |
| DevOps + Kubernetes | K8s GitOps Pipeline |
| DevOps + AWS | AWS Infrastructure with Terraform |
| Python + TensorFlow | ML Pipeline |
| Python + Pandas | Data Analytics Pipeline |

---

### 5. assignmentPdfGenerator.js — PDF Generator

**Shu kare chhe:**
- pdfkit library use kare
- Professional enterprise-grade PDF banave
- Save kare: `webhook-server/generated-pdfs/assignment-{name}-{timestamp}.pdf`

**PDF Structure:**

```
Page Header (Navy blue band)
  - SensusSoft Technologies logo text
  - "TECHNICAL ASSIGNMENT" label
  - "CONFIDENTIAL" label

Cover Section (Candidate Info Card)
  - Candidate name (large)
  - Role badge (blue)
  - Seniority badge (colored)
  - Email, Category, Deadline
  - Issue date

Section 1: Profile Summary
Section 2: Assigned Project Title
Section 3: Project Scenario
Section 4: Assignment Requirements (numbered)
Section 5: Expected Deliverables (numbered)
Section 6: Evaluation Criteria (numbered)
Section 7: GitHub Repository (if dev role)
  - Repo URL (clickable link)
  - Warning box (yellow)
Section 8: Deadline & Submission Instructions

Closing Note (green box)
  - Encouragement message
  - SensusSoft signature

Footer (every page)
  - Company name + confidentiality notice
  - Page number
```

**Design Theme:**
- Primary: Navy blue `#1E3A5F`
- Accent: Blue `#2563EB`
- Success: Green `#166534`
- Warning: Amber `#92400E`
- Font: Helvetica (built-in pdfkit)

---

### 6. githubService.js — GitHub API Integration

**Shu kare chhe:**
- GitHub par candidate mate private/public repository create kare
- README.md aur TASK.md files add kare
- Webhook attach kare (submission detect karva)
- Submission pachhi repository permanently lock kare

**`createRepo({ fullName, role, assignmentTitle, assignmentRequirements })`:**

```
1. GitHub token verify karo
2. Unique repo name banavo: {name}-{role}-{timestamp}-demo-task
3. Repository create karo (public, auto-init)
4. 4 seconds wait (GitHub initialization)
5. README.md create karo
6. TASK.md create karo
7. 5 seconds wait (sync)
8. Webhook attach karo
9. 4 seconds wait (propagation)
10. Repository verify karo
11. URL return karo
```

**`lockRepoAfterSubmission(repoName)`:**

```
1. Branch ruleset create karo (deletion, non_fast_forward, creation, update block)
2. Branch protection enable karo (enforce_admins: true)
3. Repository archive karo (permanently read-only)
```

**Repo Name Format:**
```
john-doe-react-developer-1748765432100-demo-task
```

---

### 7. githubWebhookHandler.js — Submission Handler

**Shu kare chhe:**
- GitHub thi push event receive kare
- Candidate submission process kare
- Evaluation trigger kare
- HR ne notify kare
- Repository lock kare

**Flow:**
```
GitHub Push Event received
        |
        |-- ping event? --> return 200 OK
        |-- not push?   --> return 200 "Event ignored"
        |
        |-- Already processed? --> return "Final submission already accepted"
        |
        |-- Mark as processed (processedRepos Set)
        |
        |-- githubAutoEvaluator() --> Score calculate karo
        |
        |-- hrEvaluationMailer() --> HR ne email karo
        |
        |-- lockRepoAfterSubmission() --> Repo permanently lock karo
```

**Important:** `processedRepos` Set in-memory chhe — server restart thay to reset thay.

---

### 8. githubAutoEvaluator.js — Auto Evaluation Engine

**Shu kare chhe:**
- GitHub repository analyze kare
- Submission quality score kare (0-100)
- Evaluation PDF generate kare

**Checks Performed:**

| Check | Points | Description |
|-------|--------|-------------|
| README.md exists | 10 | Documentation present |
| TASK.md exists | 10 | Task file present |
| Frontend/Backend folder | 15 | Code structure |
| Commit count >= 1 | 10 | Has commits |
| package.json exists | 10 | Node project |
| Source files >= 3 | 15 | Actual code written |
| Deployment URL in README | 10 | Live deployment proof |
| Screenshots present | 10 | Visual proof |
| Overall completeness | 10 | All basics covered |
| **Total** | **100** | |

**Score Remarks:**
- 85+ → "Excellent Submission"
- 70-85 → "Good Submission"
- 50-70 → "Average Submission"
- <50 → "Weak Submission"

---

### 9. hrEvaluationMailer.js — HR Notification

**Shu kare chhe:**
- HR ne candidate submission evaluation email kare
- Evaluation PDF attach kare

**Email Content:**
```
Subject: Candidate Technical Task Submission Completed

Candidate Name: John Doe
Repository URL: https://github.com/...
Commit Count: 5
Final AI Score: 75/100
AI Remark: Good Submission

Attachment: candidate-submission-evaluation.pdf
```

---

## Complete Data Flow — Step by Step

### Step 1: Candidate Applies

```
Candidate fills form:
  Name: "Rahul Shah"
  Email: "rahul@gmail.com"
  Role: "React Developer"
  Skills: "React, Node.js, MongoDB, Firebase, 3 years experience"

POST /api/career-apply
```

### Step 2: Server Processes

```
server.js receives request
  |
  |- needsGithubRepo("React Developer") = TRUE
  |
  |- githubService.createRepo() called
  |    Creates: rahul-shah-react-developer-1748765432-demo-task
  |    Adds: README.md, TASK.md
  |    Attaches: webhook
  |    Returns: { url: "https://github.com/user/rahul-shah-..." }
  |
  |- processCandidate(profile, githubRepoUrl) called
```

### Step 3: Brain.js Processes

```
brain.js receives:
  profile = { name: "Rahul Shah", email: "rahul@gmail.com", 
              role: "React Developer", cv_text: "React, Node.js..." }
  githubRepoUrl = "https://github.com/..."

Step 1: detectMismatch()
  - isDevRole = TRUE (role includes "developer")
  - hasDevSkills = TRUE (cv has "react", "node.js", "mongodb")
  - Result: { mismatch: false } ✅ Continue

Step 2: generateTask()
  - callOpenRouter(buildPrompt(profile))
  - AI reads: React, Node.js, MongoDB, Firebase, 3 years
  - AI invents: "AI-Powered FinTech Transaction Analytics Platform"
  - Returns unique assignment JSON

Step 3: generateAssignmentPdf()
  - Creates professional PDF
  - Saves to: generated-pdfs/assignment-rahul-shah-1748765432.pdf

Step 4: Send email
  - To: rahul@gmail.com
  - Subject: "SensusSoft Assignment — AI-Powered FinTech Transaction Analytics Platform"
  - HTML email with full assignment
  - PDF attached
  - GitHub repo link included
```

### Step 4: Candidate Receives Email

```
Email contains:
  - Assignment title: "AI-Powered FinTech Transaction Analytics Platform"
  - Project scenario (unique, based on their profile)
  - 12 requirements (using their actual tech stack)
  - 6 deliverables
  - 7 evaluation criteria
  - GitHub repo link
  - 3 working days deadline
  - PDF attachment
```

### Step 5: Candidate Submits Code

```
Candidate pushes code to GitHub repo
  |
  GitHub fires webhook to:
  https://sensussoft-ai-hiring-automation.vercel.app/api/github-submission-webhook
  |
  githubWebhookHandler.js receives push event
```

### Step 6: Auto Evaluation

```
githubAutoEvaluator.js:
  - Fetches repo tree (all files)
  - Checks README.md: YES (+10)
  - Checks TASK.md: YES (+10)
  - Checks src/ folder: YES (+15)
  - Checks commits: 8 commits (+10)
  - Checks package.json: YES (+10)
  - Counts source files: 15 files (+15)
  - Checks deployment URL in README: YES (+10)
  - Checks screenshots: YES (+10)
  - Completeness: YES (+10)
  - Total Score: 100/100
  - Remark: "Excellent Submission"
  - Generates evaluation PDF
```

### Step 7: HR Notification

```
hrEvaluationMailer.js sends to HR_EMAIL:
  Subject: "Candidate Technical Task Submission Completed"
  
  Candidate Name: Rahul Shah
  Repository URL: https://github.com/...
  Commit Count: 8
  Final AI Score: 100/100
  AI Remark: Excellent Submission
  
  Attachment: candidate-submission-evaluation.pdf
```

### Step 8: Repository Locked

```
lockRepoAfterSubmission():
  1. Branch ruleset: block all pushes, deletions, force pushes
  2. Branch protection: enforce_admins = true
  3. Repository archived: permanently read-only
  
  Console: "REPOSITORY PERMANENTLY LOCKED => rahul-shah-react-developer-..."
```

---

## Role Mismatch Examples

### Example 1: MISMATCH — Designer applying for Dev role

```
Role: "React Developer"
CV: "Figma, Adobe XD, wireframes, prototypes, UI design, UX research"

detectMismatch() result:
  isDevRole = TRUE
  hasDevSkills = FALSE
  hasDesignSkills = TRUE
  designOnlyCount = 6 (>= 2)
  
  → MISMATCH DETECTED

Email sent to candidate:
  "You applied for a Software Developer / Engineer role, but your resume 
   contains primarily design skills (Figma, wireframes, prototypes, etc.) 
   with no software development skills such as React, JavaScript, Node.js, 
   APIs, or databases. Please apply for a UI/UX Designer role instead."

NO task generated
NO GitHub repo created
NO PDF generated
```

### Example 2: MISMATCH — Dev applying for Design role

```
Role: "UI/UX Designer"
CV: "React, Node.js, MongoDB, Express, REST API, Firebase"

detectMismatch() result:
  isDesignRole = TRUE
  hasDesignSkills = FALSE
  hasDevSkills = TRUE
  
  → MISMATCH DETECTED

Email sent:
  "You applied for a UI/UX / Design role, but your resume contains primarily 
   software development skills (React, Node.js, APIs, etc.) with no design 
   tools such as Figma, Adobe XD, wireframing, or UX research. 
   Please apply for a Developer role instead."
```

### Example 3: VALID — Mixed skills

```
Role: "UI/UX Designer"
CV: "Figma, Adobe XD, wireframes, React, some frontend development"

detectMismatch() result:
  isDesignRole = TRUE
  hasDesignSkills = TRUE (figma, adobe xd, wireframes)
  
  → NO MISMATCH ✅ (design skills present)
  → Assignment generated normally
```

---

## AI Assignment Generation

### How AI Creates Unique Assignments

The AI prompt instructs:
1. Read candidate's ACTUAL tech stack
2. Identify their domain background
3. Pick a DIFFERENT or ELEVATED domain
4. Invent a completely unique enterprise project

### Domain Ideas AI Picks From:
- AI-powered SaaS platform
- FinTech platform (payments, trading, banking, crypto)
- Healthcare ERP (patient management, telemedicine)
- E-commerce analytics
- Real-time collaboration tool
- DevOps automation platform
- IoT dashboard
- Marketplace platform
- EdTech platform (LMS, quiz engine)
- Logistics and supply chain
- CRM / sales automation
- Social media analytics
- Crypto / Web3 portfolio tracker
- Multi-tenant enterprise SaaS

### Same Role, Different Assignments:

| Candidate | Tech Stack | AI-Generated Assignment |
|-----------|-----------|------------------------|
| Rahul | React + Firebase | Real-Time Healthcare Patient Dashboard |
| Priya | React + OpenAI + Next.js | AI Legal Document Analysis Platform |
| Amit | React + Stripe + Ecommerce | B2B Marketplace Analytics Engine |
| Sara | React + Socket.io | Live Trading Floor Collaboration Tool |
| Dev | Node.js + MongoDB | Logistics Microservice API Platform |
| Raj | Node.js + GraphQL | Social Media Analytics GraphQL API |

---

## API Reference

### POST /api/career-apply

**Request Body (multipart/form-data or JSON):**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "appliedRole": "React Developer",
  "skills": "React, Node.js, MongoDB, 3 years experience..."
}
```

**Success Response (201):**
```json
{
  "success": true,
  "taskTitle": "AI-Powered FinTech Analytics Platform",
  "category": "development",
  "seniority": "mid",
  "githubRepoUrl": "https://github.com/user/john-doe-react-developer-..."
}
```

**Mismatch Response (201):**
```json
{
  "success": true,
  "taskTitle": undefined,
  "category": undefined,
  "seniority": undefined,
  "githubRepoUrl": null
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields"
}
```

### POST /api/github-submission-webhook

GitHub thi automatically call thay — manually call karvo nathi.

---

## Dependencies

```json
{
  "dotenv": "^17.4.2",        // Environment variables
  "express": "^5.2.1",        // Web server
  "mammoth": "^1.12.0",       // DOCX file parsing
  "multer": "^2.1.1",         // File upload handling
  "node-fetch": "^2.7.0",     // HTTP requests (GitHub API, OpenRouter)
  "nodemailer": "^8.0.7",     // Email sending
  "openai": "^6.35.0",        // OpenAI SDK (optional)
  "pdf-parse": "^2.4.5",      // PDF text extraction
  "pdfkit": "^0.18.0"         // PDF generation
}
```

---

## Local Setup

```bash
# 1. Clone project
git clone <repo-url>
cd local-ai-hiring-demo

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp webhook-server/.env.example webhook-server/.env
# Edit .env with your actual values

# 4. Start server
node webhook-server/server.js

# Server runs on http://localhost:4000
# Open index.html in browser to test
```

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# OPENROUTER_API_KEY, GITHUB_TOKEN, GITHUB_USER, SMTP_EMAIL, SMTP_PASS, HR_EMAIL
```

**vercel.json** routes all requests to `api/index.js` which loads `webhook-server/server.js`.

---

## Console Logs Reference

```
CAREER APPLY API HIT
GITHUB REPO CREATED => https://github.com/...
[Brain] Trying model => openai/gpt-4o-mini
[Brain] OpenRouter model used => openai/gpt-4o-mini
[Brain] AI task accepted => AI-Powered FinTech Analytics Platform
[Brain] PDF generated => /path/to/assignment-john-doe-123.pdf
[Brain] Assignment email sent => john@example.com
[Webhook] Evaluation completed
[Webhook] HR mail sent
[Webhook] Repository permanent lock applied
[Webhook] FIRST CANDIDATE PUSH ACCEPTED -> REPOSITORY FROZEN FOREVER
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| AI generation fails | Falls back to taskTemplates.js |
| PDF generation fails | Email sends without PDF attachment |
| GitHub repo creation fails | Assignment still sent, no repo link |
| Email sending fails | Logged, process continues |
| Webhook evaluation fails | HR email still attempted |
| Repository lock fails | Logged, process continues |

---

## Security Notes

- GitHub token: Never commit to git (use .env)
- Gmail: Use App Password, not regular password
- OpenRouter key: Keep secret
- Audit logs: Stored in /tmp on Vercel (ephemeral)
- PDFs: Stored in generated-pdfs/ folder
- Repository: Permanently locked after first candidate push

---

## Summary

**SensusSoft AI Hiring Automation** ek complete end-to-end hiring automation system chhe jo:

1. **Candidate apply kare** → Form submit
2. **Validation** → Role vs Skills strict check
3. **AI Assignment** → Completely unique, candidate-specific enterprise project
4. **GitHub Repo** → Auto-created, webhook attached
5. **PDF** → Professional enterprise assignment document
6. **Email** → Candidate ne PDF sathe assignment
7. **Submission** → Candidate code push kare
8. **Auto Evaluation** → Score 0-100, PDF report
9. **HR Notification** → Evaluation email with PDF
10. **Lock** → Repository permanently frozen

**Zero manual work. Fully automated.**
