#!/usr/bin/env python3
"""Helper script to build taskTemplates.js"""

import os

OUT = os.path.join(os.path.dirname(__file__), 'taskTemplates.js')

# ── helpers ────────────────────────────────────────────────────────────────────
def task(category, title, scenario, reqs, delivs, criteria, seniority, cv_summary):
    """Return a JS object literal string for one task generator function."""
    def arr(items):
        inner = ',\n'.join(f"      '{i}'" for i in items)
        return f'[\n{inner}\n    ]'
    return f"""  return {{
    category: '{category}',
    title: prefix + '{title}',
    scenario: '{scenario}' + suffix,
    requirements: {arr(reqs)},
    deliverables: {arr(delivs)},
    evaluation_criteria: {arr(criteria)},
    deadline_days: 3,
    cv_summary: '{cv_summary}',
    detected_seniority: seniority
  }};"""

def fn(name, category, title, scenario, reqs, delivs, criteria, cv_summary):
    body = task(category, title, scenario, reqs, delivs, criteria, 'seniority', cv_summary)
    return f"""
function {name}(seniority) {{
  const prefix = seniority === 'senior' ? 'Senior-Level ' : '';
  const suffix = seniority === 'senior'
    ? ' As a senior candidate, demonstrate architectural decision-making and production-grade standards.'
    : seniority === 'junior'
    ? ' As a junior candidate, focus on clean fundamentals and readable code.'
    : '';
  const reqs = {body.split('requirements:')[1].split(',')[0].strip()};
  // trim for junior
  const finalReqs = seniority === 'junior' ? reqs.slice(0, 8) : reqs;
  return {{
    category: '{category}',
    title: prefix + '{title}',
    scenario: '{scenario}' + suffix,
    requirements: finalReqs,
    deliverables: {task(category, title, scenario, reqs, delivs, criteria, 'seniority', cv_summary).split('deliverables:')[1].split(',')[0].strip()},
    evaluation_criteria: {task(category, title, scenario, reqs, delivs, criteria, 'seniority', cv_summary).split('evaluation_criteria:')[1].split(',')[0].strip()},
    deadline_days: 3,
    cv_summary: '{cv_summary}',
    detected_seniority: seniority
  }};
}}"""

# ── write file ─────────────────────────────────────────────────────────────────
with open(OUT, 'w') as f:
    f.write("'use strict';\n\n")
    f.write("// taskTemplates.js — Dynamic skill-aware assignment generator\n")
    f.write("// Same role NEVER gets same assignment — driven by CV tech stack + experience\n\n")

print("Script placeholder written — use the node approach instead")
