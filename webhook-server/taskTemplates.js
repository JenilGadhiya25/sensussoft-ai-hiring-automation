'use strict';

/**
 * taskTemplates.js
 *
 * Skill-aware task template selector for SensusSoft AI Hiring Automation.
 *
 * How it works:
 *  1. detectCategory()  — reads role + cv_text, returns one of:
 *       react | nextjs | node | fullstack | uiux | qa | devops | product | android | python
 *  2. getTemplate()     — returns the matching enterprise-level task object
 *  3. selectTemplate()  — public entry point used by brain.js
 *
 * brain.js integration:
 *   const { selectTemplate } = require('./taskTemplates');
 *   const task = selectTemplate(profile);   // profile = { role, cv_text }
 *   // task has: category, title, scenario, requirements[], deliverables[],
 *   //           evaluation_criteria[], deadline_days, cv_summary, detected_seniority
 */

// ─────────────────────────────────────────────────────────────────────────────
//  KEYWORD MAPS
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_SIGNALS = {
  react:    ['react', 'react.js', 'reactjs', 'redux', 'react native', 'vite', 'cra'],
  nextjs:   ['next.js', 'nextjs', 'next js', 'vercel', 'ssr', 'ssg', 'app router'],
  node:     ['node.js', 'nodejs', 'node js', 'express', 'rest api', 'graphql', 'fastify', 'hapi'],
  fullstack:['full stack', 'fullstack', 'mern', 'mean', 'full-stack'],
  uiux:     ['figma', 'ui/ux', 'ui ux', 'ux designer', 'ui designer', 'adobe xd', 'wireframe',
             'prototype', 'sketch', 'zeplin', 'invision', 'user research', 'design system'],
  qa:       ['qa', 'quality assurance', 'tester', 'testing', 'cypress', 'selenium',
             'playwright', 'jest', 'postman', 'automation testing', 'manual testing'],
  devops:   ['devops', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'jenkins', 'github actions',
             'aws', 'gcp', 'azure', 'terraform', 'ansible', 'nginx', 'linux', 'bash'],
  android:  ['android', 'kotlin', 'java android', 'flutter', 'dart', 'ios', 'swift', 'mobile'],
  python:   ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'machine learning',
             'ml', 'ai', 'data science', 'scikit', 'tensorflow', 'pytorch'],
  product:  ['product manager', 'product owner', 'prd', 'roadmap', 'user stories', 'agile', 'scrum']
};

// ─────────────────────────────────────────────────────────────────────────────
//  CATEGORY DETECTOR
// ─────────────────────────────────────────────────────────────────────────────

function detectCategory(profile) {
  const role  = (profile.role     || '').toLowerCase();
  const skills = (profile.cv_text || '').toLowerCase();
  const combined = role + ' ' + skills;

  // Score each category by how many of its keywords appear in combined text
  const scores = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_SIGNALS)) {
    scores[cat] = keywords.filter(kw => combined.includes(kw)).length;
  }

  // Pick highest score
  const best = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .find(([, score]) => score > 0);

  if (best) return best[0];

  // Role-name fallback when no keyword matched
  if (role.includes('react'))    return 'react';
  if (role.includes('next'))     return 'nextjs';
  if (role.includes('node'))     return 'node';
  if (role.includes('full'))     return 'fullstack';
  if (role.includes('ui') || role.includes('ux') || role.includes('design')) return 'uiux';
  if (role.includes('qa') || role.includes('test')) return 'qa';
  if (role.includes('devops') || role.includes('cloud')) return 'devops';
  if (role.includes('android') || role.includes('mobile') || role.includes('flutter')) return 'android';
  if (role.includes('python') || role.includes('data') || role.includes('ml')) return 'python';
  if (role.includes('product')) return 'product';

  return 'fullstack'; // safe default
}

// ─────────────────────────────────────────────────────────────────────────────
//  SENIORITY DETECTOR
// ─────────────────────────────────────────────────────────────────────────────

function detectSeniority(profile) {
  const text = (profile.cv_text || profile.role || '').toLowerCase();
  if (text.includes('senior') || text.includes('lead') || text.includes('architect')) return 'senior';
  if (text.includes('junior') || text.includes('fresher') || text.includes('intern'))  return 'junior';
  return 'mid';
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPLATE LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATES = {

  // ── REACT ──────────────────────────────────────────────────────────────────
  react: {
    category: 'development',
    title: 'Enterprise React SaaS Analytics Dashboard',
    scenario:
      'SensusSoft requires a production-grade SaaS analytics dashboard built with React. ' +
      'The platform must support multi-tenant data visualization, real-time chart updates, ' +
      'role-based access control, and a fully responsive component library. ' +
      'The system will be used by enterprise clients to monitor KPIs, user activity, and revenue metrics.',
    requirements: [
      'Build the application using React 18+ with functional components and hooks',
      'Implement global state management using Redux Toolkit or Zustand',
      'Create a reusable component library: Button, Card, Table, Modal, Sidebar, Navbar',
      'Integrate Chart.js or Recharts for interactive KPI visualizations',
      'Implement JWT-based authentication with protected routes',
      'Build a role-based access system: Admin, Manager, Viewer',
      'Connect to a REST API backend (mock or real) for dashboard data',
      'Implement real-time data refresh using polling or WebSocket',
      'Add dark/light theme toggle with persistent user preference',
      'Ensure full responsiveness across desktop, tablet, and mobile',
      'Write unit tests for at least 3 core components using React Testing Library',
      'Deploy the application to Vercel or Netlify with a live URL'
    ],
    deliverables: [
      'Complete GitHub repository with clean commit history',
      'Live deployment URL (Vercel / Netlify)',
      'README with setup instructions, architecture overview, and screenshots',
      'Component library documentation (Storybook or inline docs)',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'React architecture quality and component reusability',
      'State management implementation and data flow',
      'UI responsiveness and visual consistency',
      'Authentication and role-based access correctness',
      'Code quality, naming conventions, and folder structure',
      'Test coverage and quality',
      'Deployment completeness and README quality'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate demonstrates strong React ecosystem knowledge with component-driven architecture and modern frontend tooling.',
    detected_seniority: 'mid'
  },

  // ── NEXT.JS ────────────────────────────────────────────────────────────────
  nextjs: {
    category: 'development',
    title: 'Enterprise Next.js AI-Powered Content Platform',
    scenario:
      'SensusSoft is building a content intelligence platform using Next.js 14 App Router. ' +
      'The platform aggregates articles, generates AI summaries, and serves them via SSR/SSG ' +
      'for maximum SEO performance. It must support multi-language content, ' +
      'subscription-based access, and an admin CMS panel.',
    requirements: [
      'Use Next.js 14 with App Router, Server Components, and Server Actions',
      'Implement SSR for dynamic content pages and SSG for static marketing pages',
      'Integrate OpenAI or OpenRouter API for AI-generated content summaries',
      'Build a CMS admin panel for content creation and management',
      'Implement NextAuth.js for authentication with Google and email providers',
      'Add subscription tier system: Free, Pro, Enterprise',
      'Implement full-text search using Algolia or built-in search',
      'Optimize Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms',
      'Add internationalization (i18n) support for at least 2 languages',
      'Implement ISR (Incremental Static Regeneration) for content freshness',
      'Deploy to Vercel with environment variable configuration',
      'Write E2E tests using Playwright for critical user flows'
    ],
    deliverables: [
      'GitHub repository with App Router structure',
      'Live Vercel deployment URL',
      'README with architecture decisions and AI integration explanation',
      'Performance audit report (Lighthouse scores)',
      'E2E test suite results'
    ],
    evaluation_criteria: [
      'Next.js App Router and Server Component usage',
      'SSR/SSG/ISR strategy appropriateness',
      'AI integration quality and response handling',
      'Authentication and subscription logic',
      'SEO and Core Web Vitals performance',
      'Code organization and TypeScript usage',
      'Deployment and documentation quality'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has strong Next.js and modern React server-side rendering expertise with AI integration experience.',
    detected_seniority: 'mid'
  },

  // ── NODE.JS ────────────────────────────────────────────────────────────────
  node: {
    category: 'development',
    title: 'Enterprise Node.js REST API Gateway System',
    scenario:
      'SensusSoft requires a production-grade REST API gateway for its enterprise SaaS platform. ' +
      'The system must handle authentication, rate limiting, request validation, ' +
      'multi-database integration, background job processing, and comprehensive API documentation. ' +
      'It will serve as the backbone for multiple frontend clients.',
    requirements: [
      'Build the API using Node.js with Express.js or Fastify',
      'Implement JWT authentication with refresh token rotation',
      'Design RESTful endpoints following OpenAPI 3.0 specification',
      'Integrate MongoDB with Mongoose for primary data storage',
      'Add Redis for caching frequently accessed data and session management',
      'Implement rate limiting per IP and per authenticated user',
      'Add request validation using Joi or Zod schemas',
      'Build a background job queue using Bull or BullMQ with Redis',
      'Implement structured logging using Winston or Pino',
      'Add comprehensive error handling middleware with proper HTTP status codes',
      'Write API documentation using Swagger UI',
      'Write integration tests using Jest and Supertest',
      'Deploy to Railway, Render, or AWS EC2 with environment configuration'
    ],
    deliverables: [
      'GitHub repository with clean modular folder structure',
      'Live API deployment URL',
      'Swagger/OpenAPI documentation URL',
      'README with setup guide, environment variables, and API overview',
      'Postman collection for all endpoints',
      'Test coverage report (minimum 70%)'
    ],
    evaluation_criteria: [
      'API design quality and RESTful conventions',
      'Authentication and security implementation',
      'Database schema design and query optimization',
      'Error handling and input validation completeness',
      'Caching and performance optimization',
      'Test coverage and quality',
      'Documentation and deployment quality'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has solid Node.js backend development experience with REST API design, database integration, and server-side architecture.',
    detected_seniority: 'mid'
  },

  // ── FULL STACK ─────────────────────────────────────────────────────────────
  fullstack: {
    category: 'development',
    title: 'Enterprise Full Stack Recruitment Management SaaS',
    scenario:
      'SensusSoft requires a full-stack recruitment management platform that automates ' +
      'the entire hiring pipeline from candidate application to final offer. ' +
      'The system must support multi-role access, real-time notifications, ' +
      'AI-assisted candidate scoring, and a complete admin dashboard.',
    requirements: [
      'Build frontend using React.js or Next.js with TypeScript',
      'Develop backend REST API using Node.js and Express',
      'Implement MongoDB database with Mongoose ODM',
      'Create JWT authentication with role-based access: Admin, HR, Candidate',
      'Build candidate application form with resume upload (PDF)',
      'Implement AI-assisted candidate scoring using OpenRouter or OpenAI API',
      'Create HR admin dashboard with candidate pipeline management',
      'Add real-time notifications using Socket.io or Server-Sent Events',
      'Implement email notifications using Nodemailer',
      'Add search, filter, and pagination for candidate listings',
      'Deploy frontend to Vercel and backend to Railway or Render',
      'Write unit and integration tests with minimum 60% coverage'
    ],
    deliverables: [
      'GitHub repository with frontend and backend folders',
      'Live frontend deployment URL',
      'Live backend API URL',
      'README with full setup guide and architecture diagram',
      'Postman collection for backend APIs',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'Full stack architecture and separation of concerns',
      'Authentication and authorization implementation',
      'Database design and API quality',
      'AI integration and scoring logic',
      'UI/UX quality and responsiveness',
      'Real-time feature implementation',
      'Deployment and documentation completeness'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has full stack JavaScript development experience across frontend, backend, and database layers.',
    detected_seniority: 'mid'
  },

  // ── UI/UX ──────────────────────────────────────────────────────────────────
  uiux: {
    category: 'design',
    title: 'Enterprise FinTech Mobile Banking Design System',
    scenario:
      'SensusSoft is designing a next-generation mobile banking application for enterprise clients. ' +
      'The design must prioritize accessibility, trust, and clarity for financial transactions. ' +
      'You are required to create a complete design system, user flows, and high-fidelity prototypes ' +
      'that can be handed off directly to the development team.',
    requirements: [
      'Create a complete design system in Figma: typography, color palette, spacing, icons, components',
      'Design onboarding flow: splash screen, sign up, KYC verification, PIN setup',
      'Design core banking screens: dashboard, account overview, transaction history, transfer money',
      'Create card management screens: add card, freeze card, set limits, view statements',
      'Design notification center and security settings screens',
      'Build interactive prototype with realistic navigation flows',
      'Ensure WCAG 2.1 AA accessibility compliance across all screens',
      'Create responsive layouts for both iOS and Android screen sizes',
      'Design empty states, error states, loading states for all major screens',
      'Prepare a UX research document explaining design decisions and user journey',
      'Create a developer handoff document with spacing, assets, and component specs'
    ],
    deliverables: [
      'Figma project link with all screens and components',
      'Interactive prototype link',
      'Design system documentation PDF',
      'UX research and decision document PDF',
      'Developer handoff specification document'
    ],
    evaluation_criteria: [
      'Design system consistency and scalability',
      'User experience flow and navigation logic',
      'Visual quality and professional polish',
      'Accessibility compliance',
      'Prototype interactivity and realism',
      'Documentation quality and developer handoff readiness'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has strong UI/UX design skills with Figma expertise, design systems thinking, and user-centered design methodology.',
    detected_seniority: 'mid'
  },

  // ── QA ─────────────────────────────────────────────────────────────────────
  qa: {
    category: 'qa',
    title: 'Enterprise QA Automation Testing Framework',
    scenario:
      'SensusSoft requires a comprehensive QA automation framework for its enterprise web application. ' +
      'The framework must cover end-to-end UI testing, API testing, performance testing, ' +
      'and CI/CD integration. You will design and implement the complete testing infrastructure ' +
      'from scratch following industry best practices.',
    requirements: [
      'Set up Cypress or Playwright for end-to-end UI automation testing',
      'Write E2E test cases for: user registration, login, dashboard, CRUD operations',
      'Implement Page Object Model (POM) design pattern for test maintainability',
      'Set up Postman or REST Assured for API testing with environment variables',
      'Write API test cases covering: authentication, CRUD endpoints, error scenarios',
      'Implement data-driven testing using external test data files (JSON/CSV)',
      'Add visual regression testing using Percy or Applitools',
      'Set up performance testing using k6 or JMeter for load testing',
      'Integrate test suite with GitHub Actions CI/CD pipeline',
      'Generate HTML test reports using Allure or Mochawesome',
      'Write a comprehensive test plan document covering test strategy and coverage',
      'Implement cross-browser testing across Chrome, Firefox, and Safari'
    ],
    deliverables: [
      'GitHub repository with complete test framework',
      'Test execution report (HTML format)',
      'API test collection (Postman export)',
      'CI/CD pipeline configuration file',
      'Test plan and strategy document PDF',
      'Performance test results and analysis report'
    ],
    evaluation_criteria: [
      'Test framework architecture and maintainability',
      'Test coverage breadth and depth',
      'Page Object Model implementation quality',
      'API test completeness and edge case coverage',
      'CI/CD integration correctness',
      'Report quality and documentation',
      'Performance testing methodology'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has strong QA automation expertise with modern testing frameworks, API testing, and CI/CD integration experience.',
    detected_seniority: 'mid'
  },

  // ── DEVOPS ─────────────────────────────────────────────────────────────────
  devops: {
    category: 'devops',
    title: 'Enterprise CI/CD Infrastructure and Deployment Pipeline',
    scenario:
      'SensusSoft requires a production-grade DevOps infrastructure for its microservices platform. ' +
      'You will design and implement a complete CI/CD pipeline, containerization strategy, ' +
      'infrastructure-as-code setup, and monitoring system that supports zero-downtime deployments ' +
      'across multiple environments.',
    requirements: [
      'Containerize a Node.js + React application using Docker with multi-stage builds',
      'Write Docker Compose configuration for local development environment',
      'Set up Kubernetes deployment manifests: Deployment, Service, Ingress, ConfigMap, Secret',
      'Implement GitHub Actions CI/CD pipeline with stages: lint, test, build, deploy',
      'Configure separate environments: development, staging, production',
      'Set up infrastructure-as-code using Terraform for AWS or GCP resources',
      'Implement blue-green or canary deployment strategy',
      'Configure Nginx as reverse proxy with SSL termination',
      'Set up centralized logging using ELK Stack or Grafana Loki',
      'Implement application monitoring using Prometheus and Grafana dashboards',
      'Configure automated database backups and disaster recovery procedures',
      'Write runbook documentation for common operational procedures'
    ],
    deliverables: [
      'GitHub repository with all infrastructure code',
      'Docker and Docker Compose configuration files',
      'Kubernetes manifests folder',
      'GitHub Actions workflow files',
      'Terraform configuration files',
      'Monitoring dashboard screenshots',
      'Infrastructure architecture diagram',
      'Runbook and operational documentation PDF'
    ],
    evaluation_criteria: [
      'Docker containerization quality and image optimization',
      'CI/CD pipeline completeness and reliability',
      'Kubernetes configuration correctness',
      'Infrastructure-as-code quality',
      'Monitoring and alerting setup',
      'Security best practices (secrets management, least privilege)',
      'Documentation and runbook quality'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has strong DevOps and cloud infrastructure expertise with containerization, CI/CD, and infrastructure-as-code experience.',
    detected_seniority: 'mid'
  },

  // ── ANDROID / MOBILE ───────────────────────────────────────────────────────
  android: {
    category: 'development',
    title: 'Enterprise Cross-Platform Mobile E-Commerce Application',
    scenario:
      'SensusSoft requires a production-ready cross-platform mobile e-commerce application ' +
      'for enterprise retail clients. The app must support product browsing, cart management, ' +
      'secure payments, order tracking, and push notifications across iOS and Android platforms.',
    requirements: [
      'Build the application using Flutter (Dart) or React Native',
      'Implement clean architecture with BLoC/Provider (Flutter) or Redux (React Native)',
      'Create product listing with search, filter, and category navigation',
      'Build product detail page with image gallery, reviews, and add-to-cart',
      'Implement shopping cart with quantity management and price calculation',
      'Integrate payment gateway: Stripe or Razorpay SDK',
      'Build order management: place order, track status, order history',
      'Implement push notifications using Firebase Cloud Messaging (FCM)',
      'Add user authentication: email/password and Google Sign-In',
      'Implement offline support with local data caching',
      'Add deep linking for product sharing',
      'Deploy to Google Play Store (internal testing track) or provide APK'
    ],
    deliverables: [
      'GitHub repository with complete mobile project',
      'APK file or TestFlight/Play Store internal testing link',
      'README with setup guide and architecture explanation',
      'Screen recording demo video (2-3 minutes)',
      'Architecture diagram showing state management flow'
    ],
    evaluation_criteria: [
      'Mobile architecture and state management quality',
      'UI/UX quality and platform-specific design guidelines',
      'Payment integration correctness and security',
      'Performance and app size optimization',
      'Offline support implementation',
      'Code quality and Dart/JS best practices',
      'Documentation and demo quality'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has mobile development expertise with cross-platform frameworks, native integrations, and app store deployment experience.',
    detected_seniority: 'mid'
  },

  // ── PYTHON / DATA / ML ─────────────────────────────────────────────────────
  python: {
    category: 'development',
    title: 'Enterprise Python ML-Powered Data Analytics API',
    scenario:
      'SensusSoft requires a machine learning-powered data analytics API for its enterprise ' +
      'business intelligence platform. The system must ingest structured data, ' +
      'train predictive models, expose REST API endpoints for predictions, ' +
      'and provide an interactive analytics dashboard.',
    requirements: [
      'Build REST API using FastAPI or Django REST Framework',
      'Implement data ingestion pipeline supporting CSV, JSON, and database sources',
      'Perform exploratory data analysis (EDA) with Pandas and visualize with Matplotlib/Seaborn',
      'Train at least 2 ML models using Scikit-learn: classification and regression',
      'Implement model evaluation: accuracy, precision, recall, F1, ROC-AUC',
      'Build model versioning and experiment tracking using MLflow',
      'Expose prediction endpoints: single prediction and batch prediction',
      'Add data validation using Pydantic schemas',
      'Implement background task processing using Celery with Redis',
      'Create an interactive analytics dashboard using Streamlit or Dash',
      'Write comprehensive unit tests using pytest with minimum 70% coverage',
      'Deploy API to Railway or Render with Docker containerization'
    ],
    deliverables: [
      'GitHub repository with clean project structure',
      'Live API deployment URL with Swagger documentation',
      'Jupyter notebook with EDA and model training analysis',
      'MLflow experiment tracking dashboard screenshots',
      'Streamlit/Dash dashboard deployment URL',
      'README with setup guide and model performance metrics',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'API design quality and FastAPI/Django usage',
      'ML model selection and training methodology',
      'Model evaluation rigor and metric interpretation',
      'Data pipeline quality and validation',
      'Dashboard interactivity and insight quality',
      'Code quality and Python best practices',
      'Deployment and documentation completeness'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has Python development and data science expertise with machine learning, API development, and data visualization skills.',
    detected_seniority: 'mid'
  },

  // ── PRODUCT ────────────────────────────────────────────────────────────────
  product: {
    category: 'product',
    title: 'Enterprise SaaS Product Requirements Document — HR Automation Platform',
    scenario:
      'SensusSoft is launching a new enterprise HR automation SaaS product. ' +
      'As the Product Manager, you are responsible for defining the complete product strategy, ' +
      'writing the Product Requirements Document (PRD), creating user stories, ' +
      'designing the product roadmap, and presenting a go-to-market plan.',
    requirements: [
      'Write a complete PRD covering: problem statement, target users, goals, and success metrics',
      'Define 3 user personas with detailed profiles, pain points, and goals',
      'Create user journey maps for the 3 most critical workflows',
      'Write 20+ user stories in standard format: As a [user], I want [goal], so that [benefit]',
      'Prioritize features using RICE or MoSCoW framework with justification',
      'Design a 6-month product roadmap with quarterly milestones',
      'Define KPIs and OKRs for the first product quarter',
      'Write competitive analysis covering 3 competitors with feature comparison matrix',
      'Create a go-to-market strategy document covering pricing, positioning, and launch plan',
      'Design a feedback loop and iteration process for post-launch improvements',
      'Prepare a 10-slide executive presentation summarizing the product strategy'
    ],
    deliverables: [
      'Complete PRD document (PDF, minimum 15 pages)',
      'User stories spreadsheet (Excel or Google Sheets)',
      'Product roadmap (visual format: Notion, Miro, or Figma)',
      'Competitive analysis document',
      'Go-to-market strategy document',
      'Executive presentation (PDF or Google Slides link)'
    ],
    evaluation_criteria: [
      'PRD completeness and professional quality',
      'User story clarity and acceptance criteria quality',
      'Prioritization framework application',
      'Roadmap realism and strategic thinking',
      'Competitive analysis depth',
      'Go-to-market strategy quality',
      'Presentation clarity and executive communication'
    ],
    deadline_days: 3,
    cv_summary:
      'Candidate has product management expertise with strategic thinking, user research, and cross-functional collaboration skills.',
    detected_seniority: 'mid'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SENIORITY ADJUSTMENTS
//  Slightly tune title and scenario wording based on detected seniority
// ─────────────────────────────────────────────────────────────────────────────

function applySeniority(template, seniority) {
  const t = Object.assign({}, template);
  t.detected_seniority = seniority;

  if (seniority === 'senior') {
    t.title    = 'Senior-Level ' + t.title;
    t.scenario = t.scenario +
      ' As a senior candidate, you are expected to demonstrate architectural decision-making, ' +
      'mentorship-ready code quality, and production-grade implementation standards.';
  }

  if (seniority === 'junior') {
    t.scenario = t.scenario +
      ' As a junior candidate, focus on clean fundamentals, readable code, ' +
      'and clear documentation over feature completeness.';
    // Trim requirements to first 8 for junior
    t.requirements = t.requirements.slice(0, 8);
  }

  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * selectTemplate(profile)
 *
 * @param {object} profile  - { role: string, cv_text: string }
 * @returns {object}        - complete task object ready for brain.js and PDF generator
 */
function selectTemplate(profile) {
  const category  = detectCategory(profile);
  const seniority = detectSeniority(profile);
  const base      = TEMPLATES[category] || TEMPLATES.fullstack;
  return applySeniority(base, seniority);
}

/**
 * getAvailableCategories()
 * Returns list of all supported category keys — useful for testing.
 */
function getAvailableCategories() {
  return Object.keys(TEMPLATES);
}

module.exports = {
  selectTemplate,
  detectCategory,
  detectSeniority,
  getAvailableCategories
};
