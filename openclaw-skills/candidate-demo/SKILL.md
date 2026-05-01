# OpenClaw Skill: candidate-demo

**Trigger Event:** `career.form.submitted`

## Description
This skill is triggered when a candidate submits a job application form. It receives the candidate profile JSON, analyzes the applied role, years of experience, and skills, and then:
- Generates an HR screening score out of 100
- Creates a personalized practical technical assignment
- Generates an assignment title, requirements, and deadline
- Returns a JSON response with all results
- Saves the processed result to `audit-logs/candidate-log.json`

## API/LLM
Supports Gemini API or Anthropic API for assignment and scoring generation.

---

**Directory:** `openclaw-skills/candidate-demo/`