
export function evaluateCondition(condition, data) {
  if (!condition || condition.trim().toUpperCase() === 'DEFAULT') return true;

  try {
    let expr = condition
      .replace(/contains\((\w+),\s*["'](.+?)["']\)/g, (_, field, val) => {
        const fieldVal = data[field];
        if (fieldVal === undefined) return 'false';
        return `"${String(fieldVal).toLowerCase()}".includes("${val.toLowerCase()}")`;
      })
      .replace(/startsWith\((\w+),\s*["'](.+?)["']\)/g, (_, field, val) => {
        const fieldVal = data[field];
        if (fieldVal === undefined) return 'false';
        return `"${String(fieldVal)}".startsWith("${val}")`;
      })
      .replace(/endsWith\((\w+),\s*["'](.+?)["']\)/g, (_, field, val) => {
        const fieldVal = data[field];
        if (fieldVal === undefined) return 'false';
        return `"${String(fieldVal)}".endsWith("${val}")`;
      });


    expr = expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
      if (match in data) {
        const val = data[match];
        return typeof val === 'string' ? `"${val}"` : val;
      }
      return match;
    });
    const result = new Function(`return (${expr})`)();
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

    if (result) {
      return { matchedRule: rule, evaluationLog };
    }
  }

  if (defaultRule) {
    evaluationLog.push({ rule: 'DEFAULT', result: true, error: null });
    return { matchedRule: defaultRule, evaluationLog };
  }

  return { matchedRule: null, evaluationLog };
}
