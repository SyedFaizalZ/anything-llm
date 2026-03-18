/**
 * Execute a conditional block
 * @param {Object} config - The block configuration
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} The result indicating whether to halt
 */
async function executeConditional(config, context) {
  const { value1, operator, value2, actionIfTrue, actionIfFalse } = config;
  context.introspect(`Evaluating condition: "${value1} ${operator} ${value2}"`);

  let isTrue = false;
  // Try numeric comparison if possible, otherwise string
  const v1 = isNaN(Number(value1)) ? value1 : Number(value1);
  const v2 = isNaN(Number(value2)) ? value2 : Number(value2);

  switch (operator) {
    case "==":
      isTrue = v1 == v2;
      break;
    case "===":
      isTrue = v1 === v2;
      break;
    case "!=":
      isTrue = v1 != v2;
      break;
    case "!==":
       isTrue = v1 !== v2;
       break;
    case ">":
      isTrue = v1 > v2;
      break;
    case "<":
      isTrue = v1 < v2;
      break;
    case ">=":
      isTrue = v1 >= v2;
      break;
    case "<=":
      isTrue = v1 <= v2;
      break;
    case "contains":
      isTrue = String(v1).includes(String(v2));
      break;
    default:
      isTrue = v1 == v2;
  }

  const action = isTrue ? actionIfTrue : actionIfFalse;
  context.introspect(`Condition evaluated to ${isTrue}. Action: ${action}`);

  if (action === "halt") {
    // We return a special object that indicates the flow should stop
    return { _flowHalt: true, result: "Flow halted due to condition" };
  }

  return { _flowHalt: false };
}

module.exports = executeConditional;
