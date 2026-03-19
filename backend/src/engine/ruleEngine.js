/**
 * Rule Engine
 *
 * Strategy: transform every bare field name in the condition to data.<field>
 * using word-boundary regex, then evaluate with new Function("data", "return " + expr)(data).
 *
 * This means:
 *   severity == "High"          → data.severity == "High"
 *   credit_score >= 750         → data.credit_score >= 750
 *   amount > 100 && country == "US" → data.amount > 100 && data.country == "US"
 *
 * Unknown fields resolve to undefined (falsy) — no ReferenceError ever.
 */

const KEYWORDS = new Set([
  'true', 'false', 'null', 'undefined',
  'return', 'typeof', 'instanceof', 'in',
  'new', 'delete', 'void', 'throw',
  'if', 'else', 'for', 'while', 'do',
  'function', 'var', 'let', 'const',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'Math',
  'includes', 'startsWith', 'endsWith', 'toLowerCase', 'toUpperCase',
  'data',
]);

/**
 * Transform a condition string so every bare identifier that is a data field
 * (or any unknown identifier) gets prefixed with "data.".
 * JS keywords and built-ins are left alone.
 */
function transformCondition(condition, data) {
  // First handle helper functions: contains(field, "val") etc.
  let expr = condition
    .replace(/contains\s*\(\s*(\w+)\s*,\s*["'](.+?)["']\s*\)/g,
      (_, field, val) => `(data.${field} !== undefined && String(data.${field}).toLowerCase().includes("${val.toLowerCase()}"))`
    )
    .replace(/startsWith\s*\(\s*(\w+)\s*,\s*["'](.+?)["']\s*\)/g,
      (_, field, val) => `(data.${field} !== undefined && String(data.${field}).startsWith("${val}"))`
    )
    .replace(/endsWith\s*\(\s*(\w+)\s*,\s*["'](.+?)["']\s*\)/g,
      (_, field, val) => `(data.${field} !== undefined && String(data.${field}).endsWith("${val}"))`
    );

  // Replace bare identifiers with data.<identifier>
  // Word boundary \b ensures we don't partially replace things like "includes"
  expr = expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
    if (KEYWORDS.has(match)) return match;          // leave JS keywords alone
    if (match.startsWith('data.')) return match;    // already prefixed
    return `data.${match}`;
  });

  return expr;
}

export function evaluateCondition(condition, data) {
  if (!condition || condition.trim().toUpperCase() === 'DEFAULT') return true;

  const transformed = transformCondition(condition, data);

  console.log(`[RuleEngine] original  : ${condition}`);
  console.log(`[RuleEngine] transformed: ${transformed}`);

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function('data', `"use strict"; return (${transformed});`)(data);
    console.log(`[RuleEngine] result    : ${result}`);
    return Boolean(result);
  } catch (err) {
    throw new Error(`Rule evaluation error for condition "${condition}": ${err.message}`);
  }
}

export function evaluateRules(rules, data) {
  const evaluationLog = [];
  let defaultRule = null;

  const priorityRules = rules.filter((r) => r.condition.trim().toUpperCase() !== 'DEFAULT');
  const defaults = rules.filter((r) => r.condition.trim().toUpperCase() === 'DEFAULT');
  if (defaults.length > 0) defaultRule = defaults[0];

  for (const rule of priorityRules) {
    let result = false;
    let error = null;

    try {
      result = evaluateCondition(rule.condition, data);
    } catch (err) {
      error = err.message;
    }

    evaluationLog.push({ rule: rule.condition, result, error: error || null });

    if (result && !error) {
      return { matchedRule: rule, evaluationLog };
    }
  }

  if (defaultRule) {
    evaluationLog.push({ rule: 'DEFAULT', result: true, error: null });
    return { matchedRule: defaultRule, evaluationLog };
  }

  return { matchedRule: null, evaluationLog };
}
