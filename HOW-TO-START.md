# 🚀 SensusSoft AI Hiring Automation — Local Start Guide

Aa file ma project locally start karva mate **step-by-step commands** chhe.

---

## ✅ Prerequisites (Pahela aa install hovu joie)

```bash
# Node.js version check (18+ joie)
node -v

# npm version check
npm -v
```

---

## 📁 Project Location

```
/Users/jenilgadhiya/Desktop/local-ai-hiring-demo/
```

---

## 🔑 Step 1 — Environment Variables Setup

Paheli vaar chalo to `.env` file check karo:

```bash
# .env file open karo
open /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server/.env
```

`.env` ma aa values bharelo hovu joie:

```env
PORT=4000
AUDIT_LOG_PATH=../audit-logs/candidate-log.json
OPENCLAW_URL=http://127.0.0.1:18789/v1/event

OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
GITHUB_USER=your-github-username
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
HR_EMAIL=hr@sensussoft.com
```

---

## 📦 Step 2 — Dependencies Install

**Root project dependencies install karo:**

```bash
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo
npm install
```

**Webhook server dependencies install karo:**

```bash
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server
npm install
```

**OpenClaw skill dependencies install karo:**

```bash
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/openclaw-skills/candidate-demo
npm install
```

---

## 🖥️ Step 3 — Server Start Karo

### Main Webhook Server Start (Port 4000)

```bash
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server
node server.js
```

**Ya npm start thi:**

```bash
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server
npm start
```

**Success message aavse:**
```
Server running on http://localhost:4000
```

---

## 🌐 Step 4 — Frontend Open Karo

**New terminal tab open karo** aur browser ma open karo:

```bash
# macOS par directly open karva
open /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/index.html
```

**Ya browser ma manually open karo:**
```
file:///Users/jenilgadhiya/Desktop/local-ai-hiring-demo/index.html
```

---

## 🤖 Step 5 — OpenClaw Start Karo (Optional)

> OpenClaw locally installed hoy to j aa step karo.
> OpenClaw na hoy to pan project kaam kare chhe — sirf OpenClaw automation skip thase.

```bash
# OpenClaw start karo (port 18789 par run thase)
openclaw start

# Ya OpenClaw skills folder thi
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/openclaw-skills
openclaw start
```

**OpenClaw running chhe ke nahi check karva:**
```bash
curl http://127.0.0.1:18789/v1/health
```

---

## 🧪 Step 6 — Test Karo

**Server health check:**

```bash
curl http://localhost:4000/
```

**Expected response:**
```
SensusSoft AI Hiring Automation Running
```

**Test application submit (curl thi):**

```bash
curl -X POST http://localhost:4000/api/career-apply \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Candidate",
    "email": "test@example.com",
    "appliedRole": "React Developer",
    "skills": "React, Node.js, MongoDB, Firebase, 3 years experience"
  }'
```

---

## 📋 Complete Startup — Ek Saath (Copy-Paste Ready)

**Terminal 1 — Server:**
```bash
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server && npm install && node server.js
```

**Terminal 2 — Frontend:**
```bash
open /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/index.html
```

---

## 🔄 Rojana Start Karva Mate (Short Commands)

Server already install thayelo hoy to sirf aa commands:

```bash
# Terminal 1: Server start
cd ~/Desktop/local-ai-hiring-demo/webhook-server && node server.js

# Terminal 2: Frontend open
open ~/Desktop/local-ai-hiring-demo/index.html
```

---

## 🛑 Server Band Karva Mate

```bash
# Terminal ma Ctrl + C press karo
^C
```

---

## 📂 Folder Structure Quick Reference

```
local-ai-hiring-demo/
│
├── index.html                    ← Career Application Form (Frontend)
│
├── webhook-server/
│   ├── server.js                 ← Main Server (PORT 4000)
│   ├── brain.js                  ← AI Processing Engine
│   ├── taskTemplates.js          ← Fallback Task Templates
│   ├── assignmentPdfGenerator.js ← PDF Generator
│   ├── githubWebhookHandler.js   ← GitHub Push Handler
│   ├── githubAutoEvaluator.js    ← Submission Evaluator
│   ├── hrEvaluationMailer.js     ← HR Email Sender
│   └── .env                      ← 🔑 API Keys (SECRET)
│
├── github-demo/
│   └── githubService.js          ← GitHub Repo Creator
│
├── openclaw-skills/
│   └── candidate-demo/
│       └── run.js                ← OpenClaw Automation Skill
│
└── audit-logs/
    └── candidate-log.json        ← All Submissions Log
```

---

## ⚠️ Common Errors & Solutions

### Error: `Cannot find module 'pdfkit'`
```bash
cd /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server
npm install
```

### Error: `EADDRINUSE: address already in use :::4000`
```bash
# Port 4000 par koi process chhe te band karo
lsof -ti:4000 | xargs kill -9
```

### Error: `Missing GITHUB_TOKEN`
```bash
# .env file check karo
cat /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server/.env
```

### Error: `All AI models failed`
- `OPENROUTER_API_KEY` check karo `.env` ma
- OpenRouter account ma credits chhe ke nahi check karo

### Error: `Email failed`
- Gmail App Password use karo (regular password nahi)
- Gmail ma "Less secure app access" enable karo ya App Password banavo

---

## 🔗 Important URLs (Server Running Hoy Tyare)

| URL | Description |
|-----|-------------|
| `http://localhost:4000/` | Server health check |
| `http://localhost:4000/api/career-apply` | Application submit API |
| `http://localhost:4000/api/github-submission-webhook` | GitHub webhook receiver |
| `file:///Users/jenilgadhiya/Desktop/local-ai-hiring-demo/index.html` | Career form frontend |

---

## 📊 Logs Joava Mate

**Server console logs** terminal ma directly dikhase.

**Audit logs joava:**
```bash
cat /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/audit-logs/candidate-log.json
```

**Generated PDFs joava:**
```bash
ls /Users/jenilgadhiya/Desktop/local-ai-hiring-demo/webhook-server/generated-pdfs/
```

---

## ✅ Checklist — Sab Kuch Sahi Chhe?

- [ ] `node -v` → v18 ya upar
- [ ] `webhook-server/.env` ma badha API keys bharela chhe
- [ ] `npm install` root ma run thayelu chhe
- [ ] `npm install` webhook-server ma run thayelu chhe
- [ ] `node server.js` run thayelu chhe
- [ ] `http://localhost:4000/` → "SensusSoft AI Hiring Automation Running" dikhay chhe
- [ ] `index.html` browser ma open chhe
- [ ] Test form submit karyo → Email aavyo

---

*SensusSoft AI Hiring Automation — Local Development Guide*
