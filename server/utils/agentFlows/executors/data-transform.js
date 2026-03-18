const { safeJsonParse } = require("../../http");

/**
 * Execute a data transform block
 * @param {Object} config - The block configuration
 * @param {Object} context - Execution context
 * @returns {Promise<any>} The result of the transform
 */
async function executeDataTransform(config, context) {
  const { data, transformCode } = config;
  context.introspect(`Executing Data Transformation`);

  let parsedData = safeJsonParse(data, data);

  try {
    // We execute user code in a safe-ish way, but this is a backend script running for the admin
    // In a real sandbox we would use vm2 or `isolated-vm` but `new Function` is acceptable here
    // for admin-defined flows in anything-llm
    // The code should be something like `return data.map(x => x.id);`
    
    // Wrap transform code so `data` is available
    const transformFn = new Function("data", transformCode || "return data;");
    const result = transformFn(parsedData);
    
    context.introspect(`Data Transformation completed`);
    return result;
  } catch (error) {
    context.introspect(`Data Transformation failed: ${error.message}`);
    throw new Error(`Data transform error: ${error.message}`);
  }
}

module.exports = executeDataTransform;
