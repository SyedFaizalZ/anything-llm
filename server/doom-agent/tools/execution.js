const config = require('../config');

class ExecutionTools {
  static async getSandbox() {
    if (!config.e2bApiKey) {
      throw new Error("E2B_API_KEY is not set. Sandboxed execution is disabled.");
    }
    const { Sandbox } = require('@e2b/code-interpreter');
    const sandbox = await Sandbox.create({ apiKey: config.e2bApiKey });
    return sandbox;
  }

  static async python_exec({ code }) {
    try {
      const sandbox = await ExecutionTools.getSandbox();
      const execution = await sandbox.runCode(code, { timeoutMs: 30000 });
      await sandbox.close();
      const stdout = execution.text || '';
      const stderr = execution.error ? execution.error.value : '';
      return `${stdout}\n${stderr}`.trim() || 'Executed successfully with no output.';
    } catch (e) {
      return `Python execution error: ${e.message}`;
    }
  }

  static async bash_exec({ command }) {
    try {
      if (!config.e2bApiKey) {
        throw new Error("E2B_API_KEY is not set. Sandboxed execution is disabled.");
      }
      const { Sandbox } = require('@e2b/code-interpreter');
      const sandbox = await Sandbox.create({ apiKey: config.e2bApiKey });
      const process = await sandbox.commands.run(command, { timeoutMs: 30000 });
      await sandbox.close();
      return `${process.stdout}\n${process.stderr}`.trim() || 'Command executed successfully.';
    } catch (e) {
      return `Bash execution error: ${e.message}`;
    }
  }
}

module.exports = {
  python_exec: ExecutionTools.python_exec,
  bash_exec: ExecutionTools.bash_exec
};
