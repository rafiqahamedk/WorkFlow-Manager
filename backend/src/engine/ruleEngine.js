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
 * gets prefixed with "data.". String literals are preserved as-is.
 *
 * Strategy:
 * 1. Extract string literals → placeholders (non-word chars, safe from regex)
 * 2. Replace bare identifiers with data.xxx (helper function names excluded)
 * 3. Expand helper functions: contains(), startsWith(), endsWith()
 * 4. Restore string literals
 */
function transformCondition(condition) {
  // Step 1: extract string literals — §N§ uses § (non-word char, won't match \b)
  const literals = [];
  let expr = condition.replace(/["'](?:[^"'\\]|\\.)*["']/g, (match) => {
    literals.push(match);
    return `\xA7${literals.length - 1}\xA7`;
  });

  // Step 2: replace bare identifiers — exclude function-call names (followed by '(')
  expr = expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\()/g, (match) => {
    if (KEYWORDS.has(match)) return match;
    return `data.${match}`;
  });

  // Step 3: expand helper functions — field is now data.field after step 2
  expr = expr
    .replace(/contains\s*\(\s*(data\.\w+)\s*,\s*\xA7(\d+)\xA7\s*\)/g,
      (_, field, idx) => {
        const inner = literals[parseInt(idx)].slice(1, -1).toLowerCase();
        return `(${field} !== undefined && String(${field}).toLowerCase().includes("${inner}"))`;
      }
    )
    .replace(/startsWith\s*\(\s*(data\.\w+)\s*,\s*\xA7(\d+)\xA7\s*\)/g,
      (_, field, idx) => {
        const inner = literals[parseInt(idx)].slice(1, -1);
        return `(${field} !== undefined && String(${field}).startsWith("${inner}"))`;
      }
    )
    .replace(/endsWith\s*\(\s*(data\.\w+)\s*,\s*\xA7(\d+)\xA7\s*\)/g,
      (_, field, idx) => {
        const inner = literals[parseInt(idx)].slice(1, -1);
        return `(${field} !== undefined && String(${field}).endsWith("${inner}"))`;
      }
    );

  // Step 4: restore string literals
  expr = expr.replace(/\xA7(\d+)\xA7/g, (_, i) => literals[parseInt(i)]);

  return expr;
}

export function evaluateCondition(condition, data) {
  if (!condition || condition.trim().toUpperCase() === 'DEFAULT') return true;

  const transformed = transformCondition(condition);

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
