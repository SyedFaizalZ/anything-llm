const config = require('../config');
const subprocess = require('child_process');
const util = require('util');
const exec = util.promisify(subprocess.exec);

class ExecutionTools {
  static async getSandbox() {
    // Check if using local execution mode
    if (config.e2bExecutionMode === 'local') {
      throw new Error("Local execution mode is enabled. E2B Sandbox is not available. Use direct python_exec/bash_exec instead.");
    }
    
    if (!config.e2bApiKey) {
      throw new Error("E2B_API_KEY is not set. Sandboxed execution is disabled. Set it in Agent Settings.");
    }
    
    try {
      const { Sandbox } = require('@e2b/code-interpreter');
      const sandbox = await Sandbox.create({ apiKey: config.e2bApiKey });
      return sandbox;
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('Unauthorized')) {
        throw new Error(`E2B API key is invalid: ${e.message}`);
      }
      throw e;
    }
  }

  static async python_exec({ code }) {
    let sandbox = null;
    try {
      // Use local execution if mode is 'local'
      if (config.e2bExecutionMode === 'local') {
        return await ExecutionTools.python_exec_local(code);
      }
      
      sandbox = await ExecutionTools.getSandbox();
      const execution = await sandbox.runCode(code, { timeoutMs: 30000 });
      const stdout = execution.text || '';
      const stderr = execution.error ? execution.error.value : '';
      return `${stdout}\n${stderr}`.trim() || 'Executed successfully with no output.';
    } catch (e) {
      console.error('[execution.js] Python execution error:', e.message);
      return `Python execution error: ${e.message}`;
    } finally {
      // Safely close sandbox if it exists and has the close method
      if (sandbox && typeof sandbox.disconnect === 'function') {
        try {
          await sandbox.disconnect();
        } catch (closeError) {
          console.warn('[execution.js] Warning closing Python sandbox:', closeError.message);
        }
      }
    }
  }

  static async python_exec_local(code) {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `doom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
      
      fs.writeFileSync(tmpFile, code, 'utf-8');
      
      try {
        const { stdout, stderr } = await exec(`python3 "${tmpFile}"`, { timeout: 30000 });
        return stdout || 'Executed successfully with no output.';
      } catch (execError) {
        return `Exit ${execError.code}: ${execError.stderr || execError.message}`;
      } finally {
        try {
          fs.unlinkSync(tmpFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (e) {
      return `Local Python execution error: ${e.message}`;
    }
  }

  static async bash_exec({ command }) {
    let sandbox = null;
    try {
      // Use local execution if mode is 'local'
      if (config.e2bExecutionMode === 'local') {
        return await ExecutionTools.bash_exec_local(command);
      }
      
      if (!config.e2bApiKey) {
        throw new Error("E2B_API_KEY is not set. Sandboxed execution is disabled.");
      }
      
      const { Sandbox } = require('@e2b/code-interpreter');
      sandbox = await Sandbox.create({ apiKey: config.e2bApiKey });
      const process = await sandbox.commands.run(command, { timeoutMs: 15000 });
      return `${process.stdout}\n${process.stderr}`.trim() || 'Command executed successfully.';
    } catch (e) {
      console.error('[execution.js] Bash execution error:', e.message);
      return `Bash execution error: ${e.message}`;
    } finally {
      // Safely close sandbox if it exists and has the disconnect method
      if (sandbox && typeof sandbox.disconnect === 'function') {
        try {
          await sandbox.disconnect();
        } catch (closeError) {
          console.warn('[execution.js] Warning closing Bash sandbox:', closeError.message);
        }
      }
    }
  }

  static async bash_exec_local(command) {
    try {
      const { stdout, stderr } = await exec(command, { timeout: 15000 });
      return stdout || 'Command executed successfully.';
    } catch (e) {
      return `Exit ${e.code}: ${e.stderr || e.message}`;
    }
  }
}

module.exports = {
  python_exec: ExecutionTools.python_exec,
  bash_exec: ExecutionTools.bash_exec,
  ExecutionTools
};
