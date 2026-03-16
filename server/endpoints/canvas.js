const { reqBody } = require("../utils/http");
const { ExecutionTools } = require("../doom-agent/tools/execution");
const config = require("../doom-agent/config");

function canvasEndpoints(apiRouter) {
  apiRouter.post("/canvas/execute", async (request, response) => {
    try {
      console.log('[canvas.js] POST /canvas/execute received');
      const { code, language } = reqBody(request);
      if (!code) {
        return response.status(400).json({ success: false, error: "Code is required" });
      }

      const lang = (language || "").toLowerCase();
      console.log(`[canvas.js] Language: ${lang}, Code length: ${code.length}`);

      if (lang === 'python' || lang === 'python3' || lang === 'canvas-python') {
        if (config.e2bExecutionMode === 'local') {
          return response.status(400).json({ success: false, error: "Canvas requires E2B Sandbox. Local execution mode is currently enabled. Switch to 'api' in Agent Settings." });
        }

        if (!config.e2bApiKey) {
          return response.status(400).json({ success: false, error: "E2B API key is not configured. Set it in Agent Settings to use Canvas." });
        }
        
        let sandbox = null;
        try {
          console.log('[canvas.js] Creating E2B sandbox...');
          sandbox = await ExecutionTools.getSandbox();
          console.log('[canvas.js] Sandbox created, running code...');

          // Run the python code directly inside the E2B Code Interpreter.
          // The code interpreter automatically captures rich outputs like matplotlib figures
          // when plt.show() is called or a figure is evaluated as the last expression.
          let processedCode = code;

          const execution = await sandbox.runCode(processedCode, { timeoutMs: 30000 });
          console.log('[canvas.js] Code executed. Results:', execution.results?.length || 0);
          
          let base64Image = null;
          let svg = null;
          let html = null;
          
          if (execution.results && execution.results.length > 0) {
            for (const res of execution.results) {
              if (res.png) base64Image = res.png;
              if (res.svg) svg = res.svg;
              if (res.html) html = res.html;
            }
          }
          
          const stdout = execution.text || '';
          const stderr = execution.error ? execution.error.value : '';
          
          console.log(`[canvas.js] Output - PNG: ${!!base64Image}, SVG: ${!!svg}, HTML: ${!!html}, stdout: ${stdout.length}chars, stderr: ${stderr.length}chars`);

          return response.status(200).json({ 
            success: true, 
            stdout, 
            stderr,
            base64Image,
            svg,
            html,
            language: lang
          });
        } catch (e) {
          console.error('[canvas.js] E2B execution error:', e.message);
          return response.status(500).json({ success: false, error: `E2B execution failed: ${e.message}` });
        } finally {
          if (sandbox && typeof sandbox.disconnect === 'function') {
            try { await sandbox.disconnect(); } catch (e) {}
          }
        }
      } 
      
      // For HTML, JavaScript, or D3, we just pass the code along as 'html' output.
      console.log('[canvas.js] Non-python code, returning as HTML');
      return response.status(200).json({ success: true, html: code, language: lang });
    } catch (e) {
      console.error('[canvas.js] Canvas endpoint error:', e.message);
      return response.status(500).json({ success: false, error: e.message });
    }
  });
}

module.exports = { canvasEndpoints };
