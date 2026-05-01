// candidate-demo OpenClaw skill: run.js
// Receives candidate profile JSON, analyzes, scores, generates assignment, saves result, returns JSON
// Supports Gemini API (Google) or Anthropic API (Claude)

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// === CONFIG ===
const AUDIT_LOG_PATH = path.join(__dirname, '..', '..', '..', 'audit-logs', 'candidate-log.json');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const USE_GEMINI = !!GEMINI_API_KEY;
const USE_ANTHROPIC = !!ANTHROPIC_API_KEY;

// === LLM PROMPT ===
function buildPrompt(profile) {
  return `You are an expert technical HR screener. Analyze the following candidate profile and:
1. Give an HR screening score out of 100 (score only, no explanation).
2. Generate a personalized practical technical assignment for the candidate's applied role and skills.
3. Provide an assignment title, requirements (3-5 bullet points), and a realistic deadline in days.

Candidate profile (JSON):\n${JSON.stringify(profile, null, 2)}\n
Respond in JSON with keys: score, assignment_title, assignment_requirements (array), deadline_days.`;
}

// === GEMINI API CALL ===
async function callGemini(prompt) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    // Try to extract JSON from the response
    const text = data.candidates[0].content.parts.map(p => p.text).join(' ');
    return extractJson(text);
  }
  throw new Error('Gemini API error: ' + JSON.stringify(data));
}

// === ANTHROPIC API CALL ===
async function callAnthropic(prompt) {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: 'claude-3-opus-20240229',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }]
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (data && data.content && Array.isArray(data.content)) {
    const text = data.content.map(p => p.text).join(' ');
    return extractJson(text);
  }
  throw new Error('Anthropic API error: ' + JSON.stringify(data));
}

// === JSON Extraction Helper ===
function extractJson(text) {
  // Try to find JSON object in text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {}
  }
  throw new Error('Could not extract JSON from LLM response: ' + text);
}

// === Main Skill Entrypoint ===
module.exports = async function run(profile) {
  if (!profile || typeof profile !== 'object') throw new Error('Missing candidate profile');
  const prompt = buildPrompt(profile);
  let result;
  if (USE_GEMINI) {
    result = await callGemini(prompt);
  } else if (USE_ANTHROPIC) {
    result = await callAnthropic(prompt);
  } else {
    throw new Error('No LLM API key set. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in env.');
  }

  // Compose response
  const response = {
    candidate: profile,
    screening_score: result.score,
    assignment: {
      title: result.assignment_title,
      requirements: result.assignment_requirements,
      deadline_days: result.deadline_days
    },
    processed_at: new Date().toISOString()
  };

  // Save to audit log
  try {
    await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    let arr = [];
    try {
      const content = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
      arr = JSON.parse(content || '[]');
    } catch (e) {
      arr = [];
    }
    arr.push({ timestamp: new Date().toISOString(), processed: response });
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(arr, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }

  return response;
};
