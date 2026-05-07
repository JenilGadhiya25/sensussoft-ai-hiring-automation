'use strict';

// taskTemplates.js — Dynamic skill-aware assignment generator
// Same role NEVER gets same assignment — driven by CV tech stack + experience

const TECH_KEYWORDS = {
  react:      ['react', 'react.js', 'reactjs', 'jsx'],
  nextjs:     ['next.js', 'nextjs', 'next js', 'vercel', 'ssr', 'ssg'],
  vue:        ['vue', 'vue.js', 'vuejs', 'nuxt'],
  node:       ['node.js', 'nodejs', 'node js', 'express', 'fastify'],
  python:     ['python', 'django', 'flask', 'fastapi'],
  java:       ['java', 'spring', 'spring boot'],
  golang:     ['golang', 'go lang', 'gin'],
  mongodb:    ['mongodb', 'mongo', 'mongoose'],
  postgresql: ['postgresql', 'postgres', 'sql'],
  mysql:      ['mysql', 'mariadb'],
  redis:      ['redis', 'cache'],
  firebase:   ['firebase', 'firestore', 'realtime database'],
  aws:        ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
  gcp:        ['gcp', 'google cloud', 'cloud run'],
  azure:      ['azure', 'microsoft azure'],
  docker:     ['docker', 'containerization'],
  kubernetes: ['kubernetes', 'k8s', 'helm'],
  cicd:       ['ci/cd', 'github actions', 'jenkins', 'gitlab ci'],
  openai:     ['openai', 'gpt', 'chatgpt', 'ai api'],
  tensorflow: ['tensorflow', 'keras'],
  pytorch:    ['pytorch', 'torch'],
  pandas:     ['pandas', 'numpy', 'scipy'],
  figma:      ['figma', 'design'],
  jest:       ['jest', 'testing'],
  cypress:    ['cypress', 'e2e testing'],
  playwright: ['playwright', 'browser automation'],
  graphql:    ['graphql', 'apollo'],
  websocket:  ['websocket', 'socket.io', 'real-time'],
  ecommerce:  ['ecommerce', 'shopify', 'woocommerce', 'stripe', 'payment'],
  mobile:     ['flutter', 'react native', 'kotlin', 'swift', 'ios', 'android'],
  blockchain: ['blockchain', 'web3', 'ethereum', 'solidity']
};

const CATEGORY_SIGNALS = {
  react:    ['react', 'react.js', 'reactjs', 'redux', 'react native', 'vite'],
  nextjs:   ['next.js', 'nextjs', 'next js', 'vercel', 'ssr', 'ssg'],
  node:     ['node.js', 'nodejs', 'node js', 'express', 'rest api', 'graphql', 'fastify'],
  fullstack:['full stack', 'fullstack', 'mern', 'mean', 'full-stack'],
  uiux:     ['figma', 'ui/ux', 'ui ux', 'ux designer', 'ui designer', 'adobe xd', 'wireframe', 'prototype'],
  qa:       ['qa', 'quality assurance', 'tester', 'testing', 'cypress', 'selenium', 'playwright'],
  devops:   ['devops', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'jenkins', 'github actions',
             'aws', 'gcp', 'azure', 'terraform', 'ansible', 'nginx', 'linux', 'bash'],
  android:  ['android', 'kotlin', 'java android', 'flutter', 'dart', 'ios', 'swift', 'mobile'],
  python:   ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'machine learning',
             'ml', 'ai', 'data science', 'scikit', 'tensorflow', 'pytorch'],
  product:  ['product manager', 'product owner', 'prd', 'roadmap', 'user stories', 'agile', 'scrum']
};
function detectTechnologies(profile) {
  const text = (profile.cv_text || "").toLowerCase();
  const detected = {};
  for (const [tech, keywords] of Object.entries(TECH_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) detected[tech] = true;
  }
  return detected;
}

function detectCategory(profile) {
  const role     = (profile.role    || "").toLowerCase();
  const skills   = (profile.cv_text || "").toLowerCase();
  const combined = role + " " + skills;
  const scores   = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_SIGNALS)) {
    scores[cat] = keywords.filter(kw => combined.includes(kw)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]).find(([, s]) => s > 0);
  if (best) return best[0];
  if (role.includes("react"))                                           return "react";
  if (role.includes("next"))                                            return "nextjs";
  if (role.includes("node"))                                            return "node";
  if (role.includes("full"))                                            return "fullstack";
  if (role.includes("ui") || role.includes("ux") || role.includes("design")) return "uiux";
  if (role.includes("qa") || role.includes("test"))                     return "qa";
  if (role.includes("devops") || role.includes("cloud"))                return "devops";
  if (role.includes("android") || role.includes("mobile") || role.includes("flutter")) return "android";
  if (role.includes("python") || role.includes("data") || role.includes("ml")) return "python";
  if (role.includes("product"))                                         return "product";
  return "fullstack";
}

function detectExperience(profile) {
  const text = (profile.cv_text || "").toLowerCase();
  const m = text.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  if (m) {
    const y = parseInt(m[1]);
    if (y >= 8) return "senior";
    if (y >= 4) return "mid";
    if (y >= 1) return "junior";
  }
  if (text.includes("senior") || text.includes("lead") || text.includes("architect") || text.includes("principal")) return "senior";
  if (text.includes("junior") || text.includes("fresher") || text.includes("intern") || text.includes("graduate"))  return "junior";
  return "mid";
}

function detectSeniority(profile) { return detectExperience(profile); }
// ── REACT TASK GENERATORS ─────────────────────────────────────────────────────

function _applyLevel(base, seniority) {
  const t = Object.assign({}, base, { detected_seniority: seniority });
  if (seniority === 'senior') {
    t.title    = 'Senior-Level ' + t.title;
    t.scenario = t.scenario + ' As a senior candidate, demonstrate architectural decision-making, system design, and production-grade implementation standards.';
  }
  if (seniority === 'junior') {
    t.scenario     = t.scenario + ' As a junior candidate, focus on clean fundamentals, readable code, and clear documentation.';
    t.requirements = t.requirements.slice(0, 8);
  }
  return t;
}

function generateReactFirebaseTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Real-Time Collaborative Task Management Platform',
    scenario: 'Build a real-time collaborative task management app using React and Firebase. Support multiple users, real-time updates, offline persistence, and team collaboration features.',
    requirements: [
      'Use React 18+ with functional components and hooks',
      'Integrate Firebase Realtime Database for real-time synchronization',
      'Implement Firebase Authentication with Google and email providers',
      'Build real-time task updates using Firebase onSnapshot listeners',
      'Create offline-first architecture with Firestore local persistence',
      'Implement collaborative workspaces with team invitation system',
      'Add real-time presence indicators showing active users online',
      'Build responsive UI with Tailwind CSS or Material UI',
      'Implement role-based access: Owner, Editor, Viewer',
      'Add task filtering, sorting, labels, and search functionality',
      'Write unit tests using React Testing Library (min 3 components)',
      'Deploy to Vercel with Firebase environment configuration'
    ],
    deliverables: [
      'GitHub repository with clean commit history',
      'Live Vercel deployment URL',
      'README with Firebase setup guide and architecture overview',
      'Demo video (2 min) showing real-time collaboration between 2 users',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'Real-time synchronization quality and latency',
      'Offline-first implementation correctness',
      'Collaborative features completeness',
      'UI/UX responsiveness across devices',
      'Code quality, folder structure, and naming conventions',
      'Test coverage and quality',
      'Deployment and documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate demonstrates expertise in React and Firebase real-time applications with collaborative features and offline-first architecture.'
  }, seniority);
}

function generateReactAITask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'AI-Powered Analytics Dashboard with Next.js and OpenAI',
    scenario: 'Build an AI-powered analytics dashboard using React and Next.js that integrates with OpenAI APIs to generate insights from uploaded data. Support real-time data visualization, AI-generated reports, and streaming responses.',
    requirements: [
      'Use Next.js 14 with App Router and React Server Components',
      'Integrate OpenAI API for data analysis and natural language insights',
      'Build interactive charts using Recharts or Chart.js',
      'Implement streaming responses for AI-generated content using SSE',
      'Create CSV/JSON data upload with preview and validation',
      'Build AI prompt templates for different analysis types (trend, anomaly, summary)',
      'Implement Redis or in-memory caching for API responses',
      'Add authentication with NextAuth.js (Google + email)',
      'Create PDF export functionality for generated reports',
      'Optimize Core Web Vitals: LCP < 2.5s, CLS < 0.1',
      'Write E2E tests with Playwright for critical user flows',
      'Deploy to Vercel with environment variable configuration'
    ],
    deliverables: [
      'GitHub repository with Next.js App Router structure',
      'Live Vercel deployment URL',
      'README with AI integration guide and environment setup',
      'Lighthouse performance audit report (score > 85)',
      'E2E test suite with at least 5 test cases'
    ],
    evaluation_criteria: [
      'AI integration quality and prompt engineering',
      'Data visualization effectiveness and interactivity',
      'Streaming implementation correctness',
      'Performance optimization and Core Web Vitals',
      'User experience and UI polish',
      'Code quality and TypeScript usage',
      'Documentation and deployment completeness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has expertise in React, Next.js, and AI API integration for building intelligent analytics applications.'
  }, seniority);
}

function generateReactEcommerceTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise React E-Commerce Platform with Payment Integration',
    scenario: 'Build a production-grade e-commerce platform frontend with React. Support product catalog, shopping cart, secure checkout, order tracking, and Stripe payment integration for an enterprise retail client.',
    requirements: [
      'Build responsive product catalog with category filtering, search, and sorting',
      'Implement shopping cart with persistent localStorage and quantity management',
      'Create multi-step checkout flow with address and payment form validation',
      'Integrate Stripe Elements for secure card payment processing',
      'Build order confirmation and order history dashboard',
      'Implement user authentication with JWT and protected routes',
      'Add product reviews, ratings, and Q&A section',
      'Create admin dashboard for product and inventory management',
      'Implement wishlist with share functionality',
      'Add recently viewed and recommended products sections',
      'Write unit and integration tests (min 60% coverage)',
      'Deploy to Vercel with Stripe webhook configuration'
    ],
    deliverables: [
      'GitHub repository with clean component architecture',
      'Live deployment URL',
      'README with Stripe setup guide and environment variables',
      'Payment integration test documentation',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'E-commerce features completeness and UX flow',
      'Stripe payment integration security and correctness',
      'Performance optimization and lazy loading',
      'State management and cart persistence',
      'Code architecture and reusability',
      'Test coverage and quality',
      'Deployment and documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has e-commerce platform development experience with payment gateway integration, complex state management, and enterprise-grade frontend architecture.'
  }, seniority);
}

function generateReactDashboardTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise React SaaS Analytics Dashboard',
    scenario: 'Build a production-grade multi-tenant SaaS analytics dashboard with React. Support real-time KPI visualization, role-based access control, dark/light theming, and a fully responsive component library for enterprise clients.',
    requirements: [
      'Build with React 18+ using functional components and custom hooks',
      'Implement global state management with Redux Toolkit or Zustand',
      'Create reusable component library: Button, Card, Table, Modal, Sidebar, Navbar, Badge',
      'Integrate Recharts or Chart.js for interactive KPI visualizations (line, bar, pie, area)',
      'Implement JWT-based authentication with refresh token rotation',
      'Build role-based access system: Admin, Manager, Viewer with route guards',
      'Connect to REST API backend (mock with MSW or real) for dashboard data',
      'Implement real-time data refresh using polling every 30 seconds',
      'Add dark/light theme toggle with CSS variables and persistent preference',
      'Ensure full responsiveness across desktop, tablet, and mobile (320px+)',
      'Write unit tests for at least 5 core components using React Testing Library',
      'Deploy to Vercel or Netlify with CI/CD pipeline'
    ],
    deliverables: [
      'GitHub repository with clean commit history and feature branches',
      'Live deployment URL (Vercel / Netlify)',
      'README with setup instructions, architecture overview, and screenshots',
      'Component documentation (Storybook or inline JSDoc)',
      'Test coverage report (minimum 60%)'
    ],
    evaluation_criteria: [
      'React architecture quality and component reusability',
      'State management implementation and data flow clarity',
      'UI responsiveness and visual consistency across breakpoints',
      'Authentication and role-based access correctness',
      'Code quality, naming conventions, and folder structure',
      'Test coverage and test quality',
      'Deployment completeness and README quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate demonstrates strong React ecosystem knowledge with component-driven architecture, state management, and modern frontend tooling.'
  }, seniority);
}

function generateReactRealtimeTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Real-Time Multiplayer Collaboration Platform',
    scenario: 'Build a real-time multiplayer collaboration platform using React and Socket.io. Support live document editing, user presence awareness, cursor tracking, and conflict resolution for enterprise teams.',
    requirements: [
      'Use React 18 with WebSocket integration via Socket.io client',
      'Implement real-time document synchronization with operational transforms',
      'Build live presence indicators showing connected users and their cursors',
      'Create conflict resolution system for simultaneous edits',
      'Implement room-based collaboration with invite links',
      'Add user authentication with session management',
      'Build activity feed showing recent changes by user',
      'Implement undo/redo functionality with history stack',
      'Add permission system: Owner, Collaborator, Read-only',
      'Create export functionality (PDF, Markdown)',
      'Write integration tests for real-time features',
      'Deploy with WebSocket support (Railway or Render)'
    ],
    deliverables: [
      'GitHub repository with frontend and backend',
      'Live deployment URL with WebSocket support',
      'README with architecture and setup guide',
      'Demo video (2 min) showing 2 users collaborating simultaneously',
      'Test suite for real-time synchronization'
    ],
    evaluation_criteria: [
      'Real-time synchronization quality and conflict handling',
      'Presence and cursor tracking accuracy',
      'User experience and collaboration UX',
      'Code quality and WebSocket implementation',
      'Performance under concurrent users',
      'Test coverage',
      'Documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has expertise in real-time collaborative applications with WebSocket integration, operational transforms, and multi-user state management.'
  }, seniority);
}

// ── NODE.JS TASK GENERATORS ───────────────────────────────────────────────────

function generateNodeMongoTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Node.js + MongoDB Microservice Platform',
    scenario: 'Build a production-grade microservice using Node.js and MongoDB. Implement RESTful APIs, JWT authentication, request validation, Redis caching, background jobs, and comprehensive testing for an enterprise SaaS backend.',
    requirements: [
      'Build with Express.js or Fastify with modular folder structure (routes/controllers/services)',
      'Design MongoDB schema with Mongoose including indexes and virtuals',
      'Implement JWT authentication with access + refresh token rotation',
      'Create RESTful CRUD endpoints following OpenAPI 3.0 specification',
      'Add request validation with Joi or Zod schemas',
      'Implement Redis caching for frequently accessed data (TTL-based)',
      'Add rate limiting per IP and per authenticated user',
      'Create centralized error handling middleware with proper HTTP status codes',
      'Implement structured logging with Winston (request ID, timestamps)',
      'Write Swagger/OpenAPI documentation for all endpoints',
      'Write integration tests with Jest + Supertest (min 70% coverage)',
      'Deploy with Docker to Railway or Render with health check endpoint'
    ],
    deliverables: [
      'GitHub repository with clean modular folder structure',
      'Live API deployment URL',
      'Swagger UI documentation URL',
      'README with setup guide, environment variables, and API overview',
      'Postman collection for all endpoints',
      'Test coverage report (minimum 70%)'
    ],
    evaluation_criteria: [
      'API design quality and RESTful conventions',
      'MongoDB schema design and query optimization',
      'Authentication and security implementation',
      'Error handling and input validation completeness',
      'Caching strategy and performance optimization',
      'Test coverage and integration test quality',
      'Documentation and deployment quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Node.js and MongoDB expertise with microservice architecture, REST API design, and production-grade backend development.'
  }, seniority);
}

function generateNodeGraphQLTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'GraphQL API Server with Node.js and Apollo',
    scenario: 'Build a production-grade GraphQL API server using Node.js and Apollo Server. Implement queries, mutations, subscriptions for real-time updates, DataLoader for N+1 prevention, and comprehensive authentication.',
    requirements: [
      'Use Apollo Server 4 with Node.js and Express',
      'Design GraphQL schema with types, queries, mutations, and subscriptions',
      'Implement JWT-based authentication with context injection',
      'Add GraphQL subscriptions for real-time data updates via WebSocket',
      'Implement DataLoader to prevent N+1 query problems',
      'Add input validation and custom scalar types',
      'Create resolvers with proper error handling and error codes',
      'Implement query complexity and depth limiting',
      'Add persisted queries for performance optimization',
      'Set up Apollo Studio or GraphQL Playground for documentation',
      'Write unit tests for resolvers (min 70% coverage)',
      'Deploy to Railway or Render with WebSocket support'
    ],
    deliverables: [
      'GitHub repository with clean resolver structure',
      'Live GraphQL endpoint URL',
      'Apollo Studio or Playground documentation link',
      'README with schema overview and authentication guide',
      'Test suite for resolvers and subscriptions'
    ],
    evaluation_criteria: [
      'GraphQL schema design quality and type safety',
      'N+1 prevention with DataLoader',
      'Real-time subscription implementation',
      'Authentication and authorization in resolvers',
      'Performance optimization and query limiting',
      'Test coverage and quality',
      'Documentation completeness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has GraphQL and Node.js expertise with Apollo Server, real-time subscriptions, and production-grade API development.'
  }, seniority);
}

function generateNodeMicroserviceTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Containerized Node.js Microservice with Kubernetes',
    scenario: 'Build a containerized microservice using Node.js, Docker, and Kubernetes. Implement service discovery, health checks, horizontal scaling, and a complete CI/CD pipeline for enterprise deployment.',
    requirements: [
      'Build Node.js microservice with Express.js and health check endpoints',
      'Create optimized Dockerfile with multi-stage builds (builder + production)',
      'Write Docker Compose for local development with all dependencies',
      'Create Kubernetes manifests: Deployment, Service, Ingress, ConfigMap, Secret, HPA',
      'Implement liveness and readiness probes',
      'Add Prometheus metrics endpoint for monitoring',
      'Implement structured logging with correlation IDs',
      'Create GitHub Actions CI/CD pipeline: lint → test → build → push → deploy',
      'Configure Nginx Ingress with SSL termination',
      'Implement graceful shutdown handling',
      'Write integration tests with Docker Compose test environment',
      'Document deployment runbook with rollback procedures'
    ],
    deliverables: [
      'GitHub repository with all infrastructure code',
      'Docker and Docker Compose configuration files',
      'Kubernetes manifests folder with all resources',
      'GitHub Actions workflow files',
      'README with deployment guide and architecture diagram',
      'Runbook for common operational procedures'
    ],
    evaluation_criteria: [
      'Microservice design and API quality',
      'Docker image optimization (size, layers, security)',
      'Kubernetes configuration correctness and best practices',
      'CI/CD pipeline completeness and reliability',
      'Monitoring and observability setup',
      'Security best practices (non-root user, secrets management)',
      'Documentation and runbook quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has microservice architecture expertise with Docker containerization, Kubernetes orchestration, and CI/CD pipeline implementation.'
  }, seniority);
}

function generateNodeAITask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'AI-Powered Backend API with Node.js and OpenAI',
    scenario: 'Build an AI-powered backend API using Node.js and OpenAI. Implement prompt engineering, streaming responses, intelligent caching, usage tracking, and rate limiting for an enterprise AI service.',
    requirements: [
      'Build with Express.js or Fastify with modular architecture',
      'Integrate OpenAI API with proper error handling and retry logic',
      'Implement reusable prompt template system with variable injection',
      'Add Server-Sent Events (SSE) for streaming AI responses',
      'Create Redis-based caching for identical prompts (semantic cache)',
      'Implement per-user token usage tracking and quota enforcement',
      'Add rate limiting: 10 req/min per user, 100 req/min global',
      'Build JWT authentication with API key support',
      'Create request/response logging with sensitive data masking',
      'Add webhook support for async AI job completion',
      'Write integration tests with mocked OpenAI responses',
      'Deploy to Railway or Render with environment configuration'
    ],
    deliverables: [
      'GitHub repository with clean architecture',
      'Live API deployment URL',
      'API documentation (Swagger or Postman collection)',
      'README with AI integration guide and rate limit documentation',
      'Test suite with mocked AI responses'
    ],
    evaluation_criteria: [
      'AI integration quality and error handling',
      'Streaming implementation correctness',
      'Caching strategy effectiveness',
      'Rate limiting and quota enforcement',
      'Security and data masking',
      'Test coverage with mocked dependencies',
      'Documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Node.js and AI API integration expertise with streaming, caching, and enterprise-grade backend architecture.'
  }, seniority);
}

function generateNodeRESTTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Node.js REST API Gateway',
    scenario: 'Build a production-grade REST API gateway using Node.js. Implement JWT authentication, rate limiting, request validation, Redis caching, background job processing, and comprehensive API documentation for an enterprise SaaS platform.',
    requirements: [
      'Build with Express.js or Fastify with layered architecture',
      'Implement JWT authentication with refresh token rotation',
      'Design RESTful endpoints following OpenAPI 3.0 specification',
      'Integrate PostgreSQL or MongoDB for primary data storage',
      'Add Redis for caching and session management',
      'Implement rate limiting per IP and per authenticated user',
      'Add request validation using Joi or Zod schemas',
      'Build background job queue using Bull or BullMQ',
      'Implement structured logging with Winston or Pino',
      'Add comprehensive error handling with proper HTTP status codes',
      'Write Swagger UI documentation for all endpoints',
      'Write integration tests with Jest + Supertest (min 70% coverage)',
      'Deploy to Railway or Render with Docker'
    ],
    deliverables: [
      'GitHub repository with clean modular folder structure',
      'Live API deployment URL',
      'Swagger/OpenAPI documentation URL',
      'README with setup guide and environment variables',
      'Postman collection for all endpoints',
      'Test coverage report (minimum 70%)'
    ],
    evaluation_criteria: [
      'API design quality and RESTful conventions',
      'Authentication and security implementation',
      'Database schema design and query optimization',
      'Error handling and input validation',
      'Caching and performance optimization',
      'Test coverage and quality',
      'Documentation and deployment quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has solid Node.js backend development experience with REST API design, database integration, and server-side architecture.'
  }, seniority);
}

// ── NEXT.JS TASK GENERATORS ───────────────────────────────────────────────────

function generateNextAITask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'AI-Powered Content Generation Platform with Next.js',
    scenario: 'Build an AI-powered content generation platform using Next.js 14. Integrate OpenAI APIs with streaming, implement a content template library, usage dashboard, and subscription-based access control.',
    requirements: [
      'Use Next.js 14 with App Router and Server Components',
      'Integrate OpenAI API with streaming via Server Actions',
      'Build content template library (blog, email, social, ad copy)',
      'Implement streaming UI with real-time token display',
      'Add NextAuth.js authentication with Google and email providers',
      'Create subscription tiers: Free (10/day), Pro (100/day), Enterprise (unlimited)',
      'Build usage dashboard with daily/monthly token consumption charts',
      'Implement content history with search and favorites',
      'Add one-click copy and export to Markdown/PDF',
      'Optimize Core Web Vitals (LCP < 2.5s)',
      'Write E2E tests with Playwright for critical flows',
      'Deploy to Vercel with environment variable configuration'
    ],
    deliverables: [
      'GitHub repository with App Router structure',
      'Live Vercel deployment URL',
      'README with AI integration and subscription setup guide',
      'Demo video showing content generation with streaming',
      'E2E test suite results'
    ],
    evaluation_criteria: [
      'AI integration quality and streaming implementation',
      'Subscription and quota enforcement logic',
      'UI/UX quality and streaming experience',
      'Performance optimization',
      'Code quality and TypeScript usage',
      'Test coverage',
      'Documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Next.js and AI API expertise with streaming, subscription management, and modern full-stack development.'
  }, seniority);
}

function generateNextEcommerceTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Next.js Enterprise E-Commerce Platform with SSR/SSG',
    scenario: 'Build a high-performance e-commerce platform using Next.js with SSR/SSG/ISR optimization. Implement product catalog, checkout, Stripe payments, and an admin dashboard with real-time inventory management.',
    requirements: [
      'Use Next.js 14 with App Router',
      'Implement SSR for product detail pages (dynamic, SEO-critical)',
      'Implement SSG for category and marketing pages',
      'Add ISR with 60-second revalidation for product listings',
      'Build product catalog with search, filter, and infinite scroll',
      'Create multi-step checkout with address validation',
      'Integrate Stripe Checkout for payment processing',
      'Build admin dashboard with product CRUD and order management',
      'Implement user authentication with NextAuth.js',
      'Add wishlist and recently viewed products',
      'Optimize Core Web Vitals: LCP < 2.5s, CLS < 0.1',
      'Deploy to Vercel with Stripe webhook endpoint'
    ],
    deliverables: [
      'GitHub repository with App Router structure',
      'Live Vercel deployment URL',
      'README with Stripe setup and environment guide',
      'Lighthouse performance report (score > 90)',
      'Test suite for checkout flow'
    ],
    evaluation_criteria: [
      'SSR/SSG/ISR strategy appropriateness per page type',
      'Performance optimization and Core Web Vitals',
      'E-commerce features completeness',
      'Stripe payment integration correctness',
      'Code quality and TypeScript usage',
      'Test coverage',
      'Documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Next.js e-commerce expertise with SSR/SSG optimization, payment integration, and performance-focused development.'
  }, seniority);
}

function generateNextRealtimeTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Real-Time Collaboration Platform with Next.js',
    scenario: 'Build a real-time collaboration platform using Next.js and Socket.io. Implement live document editing, user presence, cursor tracking, and conflict resolution for enterprise teams.',
    requirements: [
      'Use Next.js 14 with App Router and custom Socket.io server',
      'Implement real-time document synchronization',
      'Build live presence indicators with user avatars and cursors',
      'Create conflict resolution for simultaneous edits',
      'Add room-based collaboration with shareable invite links',
      'Implement NextAuth.js authentication',
      'Build activity feed with change history',
      'Add undo/redo with collaborative history',
      'Implement permission system: Owner, Editor, Viewer',
      'Create export to PDF and Markdown',
      'Write E2E tests for collaboration flows',
      'Deploy to Railway with WebSocket support'
    ],
    deliverables: [
      'GitHub repository',
      'Live deployment URL with WebSocket support',
      'README with architecture and setup guide',
      'Demo video showing 2-user collaboration',
      'E2E test suite'
    ],
    evaluation_criteria: [
      'Real-time synchronization quality',
      'Conflict resolution correctness',
      'User experience and collaboration UX',
      'Performance under concurrent users',
      'Code quality',
      'Test coverage',
      'Documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Next.js and real-time collaboration expertise with WebSocket integration and multi-user state management.'
  }, seniority);
}

function generateNextContentTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Next.js Multi-Language Content Platform',
    scenario: 'Build a content intelligence platform using Next.js 14 App Router. Support multi-language content, subscription-based access, AI-powered summaries, and an admin CMS panel with full SEO optimization.',
    requirements: [
      'Use Next.js 14 with App Router, Server Components, and Server Actions',
      'Implement SSR for dynamic content and SSG for static marketing pages',
      'Integrate OpenAI API for AI-generated content summaries',
      'Build CMS admin panel for content creation and management',
      'Implement NextAuth.js with Google and email providers',
      'Add subscription tiers: Free, Pro, Enterprise',
      'Implement full-text search with Algolia or built-in search',
      'Optimize Core Web Vitals: LCP < 2.5s, CLS < 0.1',
      'Add i18n support for at least 2 languages (English + one other)',
      'Implement ISR for content freshness (60-second revalidation)',
      'Deploy to Vercel with environment variable configuration',
      'Write E2E tests with Playwright for critical user flows'
    ],
    deliverables: [
      'GitHub repository with App Router structure',
      'Live Vercel deployment URL',
      'README with architecture decisions and AI integration explanation',
      'Lighthouse performance audit report',
      'E2E test suite results'
    ],
    evaluation_criteria: [
      'Next.js App Router and Server Component usage',
      'SSR/SSG/ISR strategy appropriateness',
      'AI integration quality',
      'Authentication and subscription logic',
      'SEO and Core Web Vitals performance',
      'Code organization and TypeScript usage',
      'Deployment and documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has strong Next.js expertise with server-side rendering, AI integration, and multi-language content platform development.'
  }, seniority);
}

// ── FULL STACK TASK GENERATORS ────────────────────────────────────────────────

function generateFullStackMERNTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Full Stack MERN Social Network Platform',
    scenario: 'Build a full-stack social network platform using the MERN stack. Implement user profiles, posts, comments, real-time notifications, direct messaging, and a content feed algorithm.',
    requirements: [
      'Build React frontend with Redux Toolkit for state management',
      'Create Node.js/Express backend with modular architecture',
      'Design MongoDB schema with proper indexing for feed queries',
      'Implement JWT authentication with refresh token rotation',
      'Build user profiles with avatar upload (Cloudinary or S3)',
      'Create post/comment system with likes and nested replies',
      'Add real-time notifications using Socket.io',
      'Implement direct messaging with read receipts',
      'Build follow/unfollow system with personalized feed',
      'Add search for users and posts with pagination',
      'Write full-stack tests (min 60% coverage)',
      'Deploy frontend to Vercel and backend to Railway'
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
      'Full-stack architecture and separation of concerns',
      'MongoDB schema design and query performance',
      'Real-time features implementation quality',
      'Authentication and authorization correctness',
      'UI/UX quality and responsiveness',
      'Code quality across frontend and backend',
      'Deployment and documentation completeness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has full-stack MERN development expertise with real-time features, social platform architecture, and end-to-end JavaScript development.'
  }, seniority);
}

function generateFullStackModernTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Modern Full Stack SaaS Platform with Next.js and Node.js',
    scenario: 'Build a modern full-stack SaaS platform using Next.js for the frontend and Node.js for the backend API. Implement multi-tenancy, subscription billing, team management, and an analytics dashboard.',
    requirements: [
      'Build Next.js 14 frontend with App Router and TypeScript',
      'Create Node.js/Express backend API with modular architecture',
      'Implement multi-tenant data isolation with organization-based access',
      'Add Stripe subscription billing with webhook handling',
      'Build team management: invite members, assign roles, manage permissions',
      'Create analytics dashboard with usage metrics and charts',
      'Implement JWT authentication with NextAuth.js on frontend',
      'Add real-time notifications using Server-Sent Events',
      'Build admin panel for platform management',
      'Implement audit logging for all user actions',
      'Write full-stack tests (min 60% coverage)',
      'Deploy frontend to Vercel and backend to Railway'
    ],
    deliverables: [
      'GitHub repository with frontend and backend folders',
      'Live frontend and backend deployment URLs',
      'README with full setup guide and architecture diagram',
      'Stripe webhook configuration guide',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'Multi-tenancy implementation correctness',
      'Stripe billing integration quality',
      'Team management and permission system',
      'Full-stack architecture quality',
      'UI/UX quality and responsiveness',
      'Code quality and TypeScript usage',
      'Deployment and documentation completeness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has modern full-stack expertise with Next.js, Node.js, multi-tenancy, and SaaS platform architecture.'
  }, seniority);
}

function generateFullStackRecruitmentTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Full Stack Recruitment Management SaaS',
    scenario: 'Build a full-stack recruitment management platform that automates the entire hiring pipeline from candidate application to final offer. Support multi-role access, real-time notifications, AI-assisted candidate scoring, and a complete admin dashboard.',
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
    cv_summary: 'Candidate has full stack JavaScript development experience across frontend, backend, and database layers.'
  }, seniority);
}

// ── UI/UX TASK GENERATORS ─────────────────────────────────────────────────────

function generateUIUXFinTechTask(seniority) {
  return _applyLevel({
    category: 'design',
    title: 'Enterprise FinTech Mobile Banking Design System',
    scenario: 'Design a next-generation mobile banking application for enterprise clients. The design must prioritize accessibility, trust, and clarity for financial transactions. Create a complete design system, user flows, and high-fidelity prototypes ready for developer handoff.',
    requirements: [
      'Create complete design system in Figma: typography, color palette, spacing, icons, components',
      'Design onboarding flow: splash, sign up, KYC verification, PIN setup (8 screens)',
      'Design core banking screens: dashboard, account overview, transaction history, transfer money',
      'Create card management: add card, freeze card, set limits, view statements',
      'Design notification center and security settings screens',
      'Build interactive prototype with realistic navigation flows',
      'Ensure WCAG 2.1 AA accessibility compliance across all screens',
      'Create responsive layouts for iOS (375px) and Android (360px) screen sizes',
      'Design empty states, error states, loading states for all major screens',
      'Prepare UX research document explaining design decisions and user journey',
      'Create developer handoff document with spacing, assets, and component specs'
    ],
    deliverables: [
      'Figma project link with all screens and components',
      'Interactive prototype link with all navigation flows',
      'Design system documentation PDF',
      'UX research and decision document PDF',
      'Developer handoff specification document'
    ],
    evaluation_criteria: [
      'Design system consistency and scalability',
      'User experience flow and navigation logic',
      'Visual quality and professional polish',
      'Accessibility compliance (WCAG 2.1 AA)',
      'Prototype interactivity and realism',
      'Documentation quality and developer handoff readiness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has strong UI/UX design skills with Figma expertise, FinTech domain knowledge, and user-centered design methodology.'
  }, seniority);
}

function generateUIUXEcommerceTask(seniority) {
  return _applyLevel({
    category: 'design',
    title: 'Enterprise E-Commerce Mobile App Design System',
    scenario: 'Design a premium e-commerce mobile application for an enterprise retail client. Create a complete design system, product discovery flows, checkout experience, and order management screens optimized for conversion.',
    requirements: [
      'Create complete design system in Figma: typography, colors, spacing, components',
      'Design home screen with personalized recommendations and banners',
      'Create product listing with filters, sorting, and grid/list toggle',
      'Design product detail page with image gallery, reviews, and size guide',
      'Build cart and multi-step checkout flow (address, payment, confirmation)',
      'Design order tracking with real-time status updates',
      'Create user profile, wishlist, and order history screens',
      'Build interactive prototype with complete shopping flow',
      'Ensure WCAG 2.1 AA accessibility compliance',
      'Design for iOS and Android screen sizes',
      'Create empty states, error states, and loading skeletons',
      'Prepare developer handoff with component specs and assets'
    ],
    deliverables: [
      'Figma project link with all screens and components',
      'Interactive prototype showing complete shopping flow',
      'Design system documentation PDF',
      'UX research document with conversion optimization rationale',
      'Developer handoff specification document'
    ],
    evaluation_criteria: [
      'Design system consistency and scalability',
      'Conversion-optimized UX flow',
      'Visual quality and brand consistency',
      'Accessibility compliance',
      'Prototype completeness and realism',
      'Developer handoff quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has UI/UX design expertise in e-commerce applications with conversion optimization, design systems, and mobile-first design.'
  }, seniority);
}

function generateUIUXSaaSTask(seniority) {
  return _applyLevel({
    category: 'design',
    title: 'Enterprise SaaS Dashboard Design System',
    scenario: 'Design a comprehensive SaaS analytics dashboard for enterprise clients. Create a scalable design system, data visualization patterns, onboarding flows, and admin interfaces that balance information density with usability.',
    requirements: [
      'Create complete design system: typography, colors, spacing, data visualization components',
      'Design onboarding flow: account setup, workspace creation, team invitation',
      'Create main dashboard with KPI cards, charts, and activity feed',
      'Design data table with sorting, filtering, bulk actions, and pagination',
      'Build settings pages: profile, team, billing, integrations, notifications',
      'Design empty states for all major sections',
      'Create dark mode variant for all screens',
      'Build interactive prototype with complete user journey',
      'Ensure WCAG 2.1 AA accessibility compliance',
      'Design responsive layouts for desktop (1440px) and tablet (768px)',
      'Create component documentation with usage guidelines',
      'Prepare developer handoff with design tokens and component specs'
    ],
    deliverables: [
      'Figma project link with all screens and components',
      'Interactive prototype with complete user journey',
      'Design system documentation with component guidelines',
      'Dark mode design file',
      'Developer handoff with design tokens'
    ],
    evaluation_criteria: [
      'Design system scalability and consistency',
      'Information architecture and navigation clarity',
      'Data visualization design quality',
      'Dark mode implementation quality',
      'Accessibility compliance',
      'Developer handoff completeness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has SaaS dashboard design expertise with design systems, data visualization, and enterprise UX patterns.'
  }, seniority);
}

function generateUIUXDesignSystemTask(seniority) {
  return _applyLevel({
    category: 'design',
    title: 'Enterprise Design System and Component Library',
    scenario: 'Create a comprehensive enterprise design system in Figma for SensusSoft. Build a scalable component library, design tokens, usage guidelines, and interactive prototypes that serve as the single source of truth for all product teams.',
    requirements: [
      'Create design token system: colors, typography, spacing, shadows, border-radius',
      'Build atomic component library: atoms (Button, Input, Badge), molecules (Card, Form, Modal), organisms (Navbar, Sidebar, Table)',
      'Design all component states: default, hover, focus, active, disabled, error',
      'Create dark mode variants for all components',
      'Build interactive prototype demonstrating component usage',
      'Ensure WCAG 2.1 AA accessibility for all components',
      'Create responsive grid system and layout templates',
      'Design icon library (min 50 icons) with consistent style',
      'Write component usage guidelines and do/don\'t examples',
      'Create design system documentation with versioning',
      'Build sample application screens using the design system',
      'Prepare developer handoff with design tokens as CSS variables'
    ],
    deliverables: [
      'Figma project link with complete component library',
      'Interactive prototype demonstrating component usage',
      'Design system documentation PDF',
      'Design tokens exported as JSON/CSS variables',
      'Developer handoff specification document'
    ],
    evaluation_criteria: [
      'Design system completeness and scalability',
      'Component consistency and reusability',
      'Accessibility compliance across all components',
      'Dark mode implementation quality',
      'Documentation clarity and developer handoff readiness',
      'Visual quality and professional polish'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has enterprise design system expertise with Figma, component architecture, design tokens, and cross-team design governance.'
  }, seniority);
}

// ── QA TASK GENERATORS ────────────────────────────────────────────────────────

function generateQAE2ETask(seniority) {
  return _applyLevel({
    category: 'qa',
    title: 'Enterprise E2E Automation Framework with Playwright/Cypress',
    scenario: 'Build a comprehensive end-to-end automation testing framework using Playwright or Cypress for SensusSoft\'s enterprise web application. Implement Page Object Model, data-driven testing, visual regression, and CI/CD integration.',
    requirements: [
      'Set up Playwright or Cypress with TypeScript configuration',
      'Implement Page Object Model (POM) design pattern for all major pages',
      'Write E2E test cases: registration, login, dashboard, CRUD operations, checkout',
      'Implement data-driven testing with external JSON/CSV test data files',
      'Add visual regression testing using Percy or Playwright screenshots',
      'Set up cross-browser testing: Chrome, Firefox, Safari, Edge',
      'Implement parallel test execution for faster CI runs',
      'Add retry logic and flaky test detection',
      'Integrate with GitHub Actions CI/CD pipeline',
      'Generate HTML test reports using Allure or Playwright HTML reporter',
      'Write comprehensive test plan document covering test strategy',
      'Implement test tagging for smoke, regression, and critical path suites'
    ],
    deliverables: [
      'GitHub repository with complete E2E framework',
      'Test execution report (HTML format with screenshots)',
      'CI/CD pipeline configuration file',
      'Test plan and strategy document PDF',
      'README with framework setup and execution guide'
    ],
    evaluation_criteria: [
      'POM implementation quality and maintainability',
      'Test coverage breadth and edge case handling',
      'Visual regression testing setup',
      'CI/CD integration correctness',
      'Parallel execution and performance',
      'Report quality and documentation',
      'Framework scalability and reusability'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has strong E2E automation expertise with Playwright/Cypress, Page Object Model, and CI/CD integration experience.'
  }, seniority);
}

function generateQAUnitTask(seniority) {
  return _applyLevel({
    category: 'qa',
    title: 'Comprehensive Unit and Integration Testing Suite with Jest',
    scenario: 'Build a comprehensive unit and integration testing suite using Jest for a Node.js/React application. Implement test-driven development practices, mock strategies, code coverage enforcement, and mutation testing.',
    requirements: [
      'Set up Jest with TypeScript and coverage thresholds (min 80%)',
      'Write unit tests for all utility functions and business logic',
      'Implement React component tests using React Testing Library',
      'Write API integration tests using Jest + Supertest',
      'Implement mock strategies: jest.mock, MSW for API mocking',
      'Add snapshot testing for UI components',
      'Set up mutation testing with Stryker to validate test quality',
      'Implement test factories and fixtures for consistent test data',
      'Add custom Jest matchers for domain-specific assertions',
      'Configure coverage reports with Istanbul/NYC',
      'Integrate with GitHub Actions with coverage gate (fail if < 80%)',
      'Write testing guidelines document for the team'
    ],
    deliverables: [
      'GitHub repository with complete test suite',
      'Coverage report (HTML format, min 80%)',
      'Mutation testing report',
      'CI/CD pipeline with coverage gate',
      'Testing guidelines document PDF'
    ],
    evaluation_criteria: [
      'Test coverage percentage and quality',
      'Mock strategy appropriateness',
      'Test isolation and independence',
      'Mutation testing score',
      'CI/CD integration with coverage gate',
      'Test readability and maintainability',
      'Documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has strong unit and integration testing expertise with Jest, React Testing Library, and test-driven development practices.'
  }, seniority);
}

function generateQAFrameworkTask(seniority) {
  return _applyLevel({
    category: 'qa',
    title: 'Enterprise QA Automation Testing Framework',
    scenario: 'Build a comprehensive QA automation framework for SensusSoft\'s enterprise web application. Cover E2E UI testing, API testing, performance testing, and CI/CD integration following industry best practices.',
    requirements: [
      'Set up Cypress or Playwright for end-to-end UI automation testing',
      'Write E2E test cases: registration, login, dashboard, CRUD operations',
      'Implement Page Object Model (POM) design pattern',
      'Set up Postman or REST Assured for API testing with environment variables',
      'Write API test cases: authentication, CRUD endpoints, error scenarios',
      'Implement data-driven testing using external test data files (JSON/CSV)',
      'Add visual regression testing using Percy or Applitools',
      'Set up performance testing using k6 or JMeter for load testing',
      'Integrate test suite with GitHub Actions CI/CD pipeline',
      'Generate HTML test reports using Allure or Mochawesome',
      'Write comprehensive test plan document covering test strategy',
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
      'POM implementation quality',
      'API test completeness and edge case coverage',
      'CI/CD integration correctness',
      'Report quality and documentation',
      'Performance testing methodology'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has strong QA automation expertise with modern testing frameworks, API testing, and CI/CD integration experience.'
  }, seniority);
}

// ── DEVOPS TASK GENERATORS ────────────────────────────────────────────────────

function generateDevOpsK8sTask(seniority) {
  return _applyLevel({
    category: 'devops',
    title: 'Enterprise Kubernetes Orchestration and GitOps Pipeline',
    scenario: 'Design and implement a production-grade Kubernetes infrastructure for SensusSoft\'s microservices platform. Implement GitOps with ArgoCD, horizontal pod autoscaling, service mesh, and comprehensive monitoring.',
    requirements: [
      'Create Kubernetes manifests: Deployment, Service, Ingress, HPA, PDB, NetworkPolicy',
      'Implement GitOps workflow with ArgoCD for declarative deployments',
      'Set up Helm charts for application packaging and versioning',
      'Configure Horizontal Pod Autoscaler based on CPU and custom metrics',
      'Implement Istio or Linkerd service mesh for traffic management',
      'Set up cert-manager for automatic TLS certificate management',
      'Configure Prometheus + Grafana for metrics and dashboards',
      'Implement distributed tracing with Jaeger or Zipkin',
      'Set up EFK stack (Elasticsearch, Fluentd, Kibana) for log aggregation',
      'Implement blue-green deployment strategy with automated rollback',
      'Configure RBAC policies and Pod Security Standards',
      'Write runbook for common operational procedures and incident response'
    ],
    deliverables: [
      'GitHub repository with all Kubernetes manifests and Helm charts',
      'ArgoCD application configuration',
      'GitHub Actions CI/CD workflow files',
      'Monitoring dashboard screenshots (Grafana)',
      'Infrastructure architecture diagram',
      'Runbook and operational documentation PDF'
    ],
    evaluation_criteria: [
      'Kubernetes configuration correctness and best practices',
      'GitOps implementation quality',
      'Autoscaling and resilience configuration',
      'Service mesh implementation',
      'Monitoring and observability completeness',
      'Security best practices (RBAC, Pod Security)',
      'Documentation and runbook quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has advanced Kubernetes expertise with GitOps, service mesh, and enterprise-grade container orchestration.'
  }, seniority);
}

function generateDevOpsDockerTask(seniority) {
  return _applyLevel({
    category: 'devops',
    title: 'Docker Containerization and CI/CD Pipeline',
    scenario: 'Containerize SensusSoft\'s Node.js + React application using Docker best practices. Implement multi-stage builds, Docker Compose for local development, and a complete GitHub Actions CI/CD pipeline.',
    requirements: [
      'Create optimized Dockerfiles with multi-stage builds for Node.js and React',
      'Implement Docker layer caching for faster builds',
      'Write Docker Compose for local development with all services',
      'Configure Docker Compose override for development vs production',
      'Implement health checks for all containers',
      'Set up Docker secrets for sensitive configuration',
      'Create GitHub Actions pipeline: lint → test → build → push → deploy',
      'Configure Docker Hub or GitHub Container Registry for image storage',
      'Implement semantic versioning for Docker image tags',
      'Set up Nginx as reverse proxy with SSL termination',
      'Configure automated security scanning with Trivy or Snyk',
      'Write deployment runbook with rollback procedures'
    ],
    deliverables: [
      'GitHub repository with all Docker configuration',
      'Docker Compose files (dev and production)',
      'GitHub Actions workflow files',
      'Nginx configuration with SSL',
      'README with deployment guide',
      'Security scan report'
    ],
    evaluation_criteria: [
      'Docker image optimization (size, layers, security)',
      'Multi-stage build implementation',
      'CI/CD pipeline completeness',
      'Security scanning integration',
      'Nginx configuration quality',
      'Documentation and runbook quality',
      'Best practices adherence'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Docker containerization expertise with multi-stage builds, CI/CD pipelines, and production deployment best practices.'
  }, seniority);
}

function generateDevOpsAWSTask(seniority) {
  return _applyLevel({
    category: 'devops',
    title: 'AWS Cloud Infrastructure with Terraform and CI/CD',
    scenario: 'Design and implement a production-grade AWS infrastructure for SensusSoft using Terraform. Set up VPC, ECS/EKS, RDS, ElastiCache, CloudFront, and a complete CI/CD pipeline with blue-green deployments.',
    requirements: [
      'Design AWS VPC with public/private subnets across 2 AZs',
      'Create Terraform modules for all AWS resources',
      'Set up ECS Fargate or EKS for container orchestration',
      'Configure RDS PostgreSQL with Multi-AZ and automated backups',
      'Set up ElastiCache Redis for caching and session management',
      'Configure CloudFront CDN with S3 for static assets',
      'Implement Application Load Balancer with SSL termination',
      'Set up AWS CodePipeline or GitHub Actions for CI/CD',
      'Implement blue-green deployment with ALB target group switching',
      'Configure CloudWatch alarms and dashboards for monitoring',
      'Set up AWS Secrets Manager for sensitive configuration',
      'Write infrastructure documentation and cost estimation'
    ],
    deliverables: [
      'GitHub repository with Terraform modules',
      'GitHub Actions or CodePipeline workflow files',
      'Architecture diagram (AWS)',
      'README with infrastructure setup guide',
      'Cost estimation document',
      'Runbook for common operational procedures'
    ],
    evaluation_criteria: [
      'Terraform code quality and module structure',
      'AWS architecture best practices',
      'High availability and fault tolerance',
      'Security configuration (IAM, Security Groups, Secrets)',
      'CI/CD pipeline completeness',
      'Monitoring and alerting setup',
      'Documentation quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has AWS cloud infrastructure expertise with Terraform, ECS/EKS, and enterprise-grade cloud architecture.'
  }, seniority);
}

function generateDevOpsCICDTask(seniority) {
  return _applyLevel({
    category: 'devops',
    title: 'Enterprise CI/CD Infrastructure and Deployment Pipeline',
    scenario: 'Design and implement a production-grade DevOps infrastructure for SensusSoft\'s microservices platform. Implement CI/CD pipeline, containerization, infrastructure-as-code, and monitoring for zero-downtime deployments.',
    requirements: [
      'Containerize Node.js + React application using Docker with multi-stage builds',
      'Write Docker Compose configuration for local development environment',
      'Set up Kubernetes manifests: Deployment, Service, Ingress, ConfigMap, Secret',
      'Implement GitHub Actions CI/CD pipeline: lint, test, build, deploy',
      'Configure separate environments: development, staging, production',
      'Set up Terraform for infrastructure-as-code (AWS or GCP)',
      'Implement blue-green or canary deployment strategy',
      'Configure Nginx as reverse proxy with SSL termination',
      'Set up centralized logging using ELK Stack or Grafana Loki',
      'Implement monitoring using Prometheus and Grafana dashboards',
      'Configure automated database backups and disaster recovery',
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
      'Security best practices',
      'Documentation and runbook quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has strong DevOps and cloud infrastructure expertise with containerization, CI/CD, and infrastructure-as-code experience.'
  }, seniority);
}

// ── PYTHON TASK GENERATORS ────────────────────────────────────────────────────

function generatePythonMLTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise ML Pipeline with TensorFlow/PyTorch',
    scenario: 'Build a production-grade machine learning pipeline using TensorFlow or PyTorch. Implement model training, evaluation, versioning, REST API serving, and an interactive monitoring dashboard.',
    requirements: [
      'Build deep learning model using TensorFlow 2.x or PyTorch',
      'Implement data preprocessing pipeline with augmentation',
      'Create model training loop with validation and early stopping',
      'Implement model evaluation: accuracy, precision, recall, F1, confusion matrix',
      'Set up MLflow for experiment tracking and model versioning',
      'Build FastAPI REST endpoint for model inference',
      'Implement batch prediction endpoint for bulk processing',
      'Add model monitoring for data drift detection',
      'Create Streamlit dashboard for model performance visualization',
      'Implement model A/B testing framework',
      'Write comprehensive tests with pytest (min 70% coverage)',
      'Deploy API with Docker to Railway or Render'
    ],
    deliverables: [
      'GitHub repository with clean ML project structure',
      'Live API deployment URL with Swagger documentation',
      'Jupyter notebook with model training analysis and results',
      'MLflow experiment tracking screenshots',
      'Streamlit dashboard deployment URL',
      'README with model architecture and performance metrics',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'Model architecture design and training methodology',
      'Model evaluation rigor and metric interpretation',
      'MLflow experiment tracking setup',
      'API design quality and inference performance',
      'Dashboard interactivity and insight quality',
      'Code quality and Python best practices',
      'Deployment and documentation completeness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has deep learning expertise with TensorFlow/PyTorch, MLOps practices, and production ML deployment.'
  }, seniority);
}

function generatePythonDataTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Data Analytics Pipeline with Python',
    scenario: 'Build a production-grade data analytics pipeline using Python, Pandas, and FastAPI. Implement data ingestion, transformation, analysis, visualization, and a REST API for data access.',
    requirements: [
      'Build data ingestion pipeline supporting CSV, JSON, Excel, and database sources',
      'Implement data cleaning and transformation with Pandas',
      'Perform exploratory data analysis (EDA) with statistical summaries',
      'Create interactive visualizations with Plotly or Matplotlib/Seaborn',
      'Build FastAPI REST endpoints for data access and analysis',
      'Implement data validation with Pydantic schemas',
      'Add data caching with Redis for expensive computations',
      'Create scheduled data refresh with Celery and Redis',
      'Build Streamlit or Dash interactive dashboard',
      'Implement data export: CSV, Excel, PDF report generation',
      'Write comprehensive tests with pytest (min 70% coverage)',
      'Deploy with Docker to Railway or Render'
    ],
    deliverables: [
      'GitHub repository with clean project structure',
      'Live API deployment URL with Swagger documentation',
      'Jupyter notebook with EDA and analysis',
      'Streamlit/Dash dashboard deployment URL',
      'README with setup guide and data pipeline documentation',
      'Test coverage report'
    ],
    evaluation_criteria: [
      'Data pipeline quality and transformation logic',
      'EDA depth and insight quality',
      'Visualization effectiveness and interactivity',
      'API design quality',
      'Code quality and Python best practices',
      'Test coverage',
      'Deployment and documentation completeness'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Python data engineering expertise with Pandas, data pipelines, visualization, and analytics API development.'
  }, seniority);
}

function generatePythonBackendTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Python REST API with Django/FastAPI',
    scenario: 'Build a production-grade REST API using Django REST Framework or FastAPI. Implement authentication, authorization, database integration, caching, background tasks, and comprehensive API documentation.',
    requirements: [
      'Build REST API using FastAPI or Django REST Framework',
      'Implement JWT authentication with refresh token rotation',
      'Design database schema with SQLAlchemy or Django ORM',
      'Add request validation with Pydantic schemas',
      'Implement Redis caching for frequently accessed data',
      'Add rate limiting per IP and per authenticated user',
      'Create background task processing with Celery and Redis',
      'Implement structured logging with structlog or loguru',
      'Add comprehensive error handling with proper HTTP status codes',
      'Write Swagger/OpenAPI documentation for all endpoints',
      'Write comprehensive tests with pytest (min 70% coverage)',
      'Deploy with Docker to Railway or Render'
    ],
    deliverables: [
      'GitHub repository with clean project structure',
      'Live API deployment URL',
      'Swagger/OpenAPI documentation URL',
      'README with setup guide and environment variables',
      'Postman collection for all endpoints',
      'Test coverage report (minimum 70%)'
    ],
    evaluation_criteria: [
      'API design quality and RESTful conventions',
      'Authentication and security implementation',
      'Database schema design and query optimization',
      'Error handling and input validation',
      'Caching and performance optimization',
      'Test coverage and quality',
      'Documentation and deployment quality'
    ],
    deadline_days: 3,
    cv_summary: 'Candidate has Python backend development expertise with Django/FastAPI, REST API design, and production-grade server-side architecture.'
  }, seniority);
}

function generatePythonAnalyticsTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Python ML-Powered Data Analytics API',
    scenario: 'Build a machine learning-powered data analytics API for SensusSoft\'s enterprise business intelligence platform. Ingest structured data, train predictive models, expose REST API endpoints for predictions, and provide an interactive analytics dashboard.',
    requirements: [
      'Build REST API using FastAPI or Django REST Framework',
      'Implement data ingestion pipeline supporting CSV, JSON, and database sources',
      'Perform EDA with Pandas and visualize with Matplotlib/Seaborn',
      'Train at least 2 ML models with Scikit-learn: classification and regression',
      'Implement model evaluation: accuracy, precision, recall, F1, ROC-AUC',
      'Build model versioning and experiment tracking using MLflow',
      'Expose prediction endpoints: single and batch prediction',
      'Add data validation using Pydantic schemas',
      'Implement background task processing using Celery with Redis',
      'Create interactive analytics dashboard using Streamlit or Dash',
      'Write comprehensive unit tests with pytest (min 70% coverage)',
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
    cv_summary: 'Candidate has Python development and data science expertise with machine learning, API development, and data visualization skills.'
  }, seniority);
}

// ── MOBILE TASK GENERATORS ────────────────────────────────────────────────────

function generateMobileEcommerceTask(seniority) {
  return _applyLevel({
    category: 'development',
    title: 'Enterprise Cross-Platform Mobile E-Commerce Application',
    scenario: 'Build a production-ready cross-platform mobile e-commerce application for enterprise retail clients using Flutter or React Native. Support product browsing, cart management, secure payments, order tracking, and push notifications.',
    requirements: [
      'Build using Flutter (Dart) or React Native with TypeScript',
      'Implement clean architecture with BLoC/Provider (Flutter) or Redux (React Native)',
      'Create product listing with search, filter, and category navigation',
      'Build product detail page with image gallery, reviews, and add-to-cart',
      'Implement shopping cart with quantity management and price calculation',
      'Integrate Stripe or Razorpay payment gateway SDK',
      'Build order management: place order, track status, order history',
      'Implement push notifications using Firebase Cloud Messaging (FCM)',
      'Add user authentication: email/password and Google Sign-In',
      'Implement offline support with local data caching',
      'Add deep linking for product sharing',
      'Deploy to Google Play Store (internal testing) or provide APK'
    ],
    deliverables: [
      'GitHub repository with complete mobile project',
      'APK file or Play Store internal testing link',
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
    cv_summary: 'Candidate has mobile development expertise with cross-platform frameworks, native integrations, and app store deployment experience.'
  }, seniority);
}

// ── PRODUCT TASK GENERATOR ────────────────────────────────────────────────────

function generateProductTask(seniority) {
  return _applyLevel({
    category: 'product',
    title: 'Enterprise SaaS Product Requirements Document — HR Automation Platform',
    scenario: 'SensusSoft is launching a new enterprise HR automation SaaS product. As the Product Manager, define the complete product strategy, write the PRD, create user stories, design the product roadmap, and present a go-to-market plan.',
    requirements: [
      'Write complete PRD: problem statement, target users, goals, and success metrics',
      'Define 3 user personas with detailed profiles, pain points, and goals',
      'Create user journey maps for the 3 most critical workflows',
      'Write 20+ user stories: As a [user], I want [goal], so that [benefit]',
      'Prioritize features using RICE or MoSCoW framework with justification',
      'Design a 6-month product roadmap with quarterly milestones',
      'Define KPIs and OKRs for the first product quarter',
      'Write competitive analysis covering 3 competitors with feature comparison matrix',
      'Create go-to-market strategy: pricing, positioning, and launch plan',
      'Design feedback loop and iteration process for post-launch improvements',
      'Prepare 10-slide executive presentation summarizing the product strategy'
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
    cv_summary: 'Candidate has product management expertise with strategic thinking, user research, and cross-functional collaboration skills.'
  }, seniority);
}

// ── DEFAULT FALLBACK ──────────────────────────────────────────────────────────

function generateDefaultTask(category, seniority) {
  return generateFullStackRecruitmentTask(seniority);
}

// ── MAIN DYNAMIC DISPATCHER ───────────────────────────────────────────────────

function generateDynamicTask(profile, category, seniority, technologies) {
  const text = (profile.cv_text || '').toLowerCase();

  if (category === 'react') {
    if (technologies.firebase && !technologies.nextjs)  return generateReactFirebaseTask(seniority);
    if (technologies.openai  && technologies.nextjs)    return generateReactAITask(seniority);
    if (technologies.ecommerce)                         return generateReactEcommerceTask(seniority);
    if (technologies.websocket)                         return generateReactRealtimeTask(seniority);
    return generateReactDashboardTask(seniority);
  }

  if (category === 'node') {
    if (technologies.mongodb)                           return generateNodeMongoTask(seniority);
    if (technologies.graphql)                           return generateNodeGraphQLTask(seniority);
    if (technologies.kubernetes || technologies.docker) return generateNodeMicroserviceTask(seniority);
    if (technologies.openai)                            return generateNodeAITask(seniority);
    return generateNodeRESTTask(seniority);
  }

  if (category === 'nextjs') {
    if (technologies.openai)                            return generateNextAITask(seniority);
    if (technologies.ecommerce)                         return generateNextEcommerceTask(seniority);
    if (technologies.websocket)                         return generateNextRealtimeTask(seniority);
    return generateNextContentTask(seniority);
  }

  if (category === 'fullstack') {
    if (technologies.react && technologies.node && technologies.mongodb) return generateFullStackMERNTask(seniority);
    if (technologies.nextjs && technologies.node)       return generateFullStackModernTask(seniority);
    return generateFullStackRecruitmentTask(seniority);
  }

  if (category === 'uiux') {
    if (text.includes('fintech') || text.includes('banking')) return generateUIUXFinTechTask(seniority);
    if (text.includes('ecommerce') || text.includes('retail')) return generateUIUXEcommerceTask(seniority);
    if (text.includes('saas'))                          return generateUIUXSaaSTask(seniority);
    return generateUIUXDesignSystemTask(seniority);
  }

  if (category === 'qa') {
    if (technologies.cypress || technologies.playwright) return generateQAE2ETask(seniority);
    if (technologies.jest)                              return generateQAUnitTask(seniority);
    return generateQAFrameworkTask(seniority);
  }

  if (category === 'devops') {
    if (technologies.kubernetes)                        return generateDevOpsK8sTask(seniority);
    if (technologies.docker)                            return generateDevOpsDockerTask(seniority);
    if (technologies.aws)                               return generateDevOpsAWSTask(seniority);
    return generateDevOpsCICDTask(seniority);
  }

  if (category === 'python') {
    if (technologies.tensorflow || technologies.pytorch) return generatePythonMLTask(seniority);
    if (technologies.pandas)                            return generatePythonDataTask(seniority);
    if (technologies.python)                            return generatePythonBackendTask(seniority);
    return generatePythonAnalyticsTask(seniority);
  }

  if (category === 'android') return generateMobileEcommerceTask(seniority);
  if (category === 'product') return generateProductTask(seniority);

  return generateDefaultTask(category, seniority);
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * selectTemplate(profile)
 *
 * Main entry point used by brain.js.
 * Dynamically selects assignment based on role + CV skills + experience.
 *
 * @param {object} profile  - { role: string, cv_text: string }
 * @returns {object}        - complete task object ready for brain.js and PDF generator
 */
function selectTemplate(profile) {
  const category     = detectCategory(profile);
  const seniority    = detectExperience(profile);
  const technologies = detectTechnologies(profile);
  return generateDynamicTask(profile, category, seniority, technologies);
}

/**
 * getAvailableCategories()
 * Returns list of all supported category keys — useful for testing.
 */
function getAvailableCategories() {
  return ['react', 'nextjs', 'node', 'fullstack', 'uiux', 'qa', 'devops', 'android', 'python', 'product'];
}

module.exports = {
  selectTemplate,
  detectCategory,
  detectSeniority,
  detectExperience,
  detectTechnologies,
  getAvailableCategories
};
