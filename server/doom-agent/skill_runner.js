const toolsRegistry = require('./tools');
const { getLLMProvider } = require("../utils/helpers");

class SkillRunner {
  constructor(config) {
    this.config = config;
  }

  async run(skill, query, context, workspace, user) {
    const LLMConnector = getLLMProvider({
      provider: workspace?.chatProvider,
      model: workspace?.chatModel,
    });

    // Step 1: Plan tools
    const plan = await this.planTools(skill, query, context, LLMConnector, user);
    if (!plan || !plan.tool_calls) {
      return await this.synthesize(skill, query, "No tools were called.", context, LLMConnector, user);
    }

    // Step 2: Execute tools sequentially
    let toolOutputs = [];
    for (const call of plan.tool_calls) {
      const result = await this.executeToolWithRetry(call, skill, workspace, user);
      toolOutputs.push(`[${call.tool}] Output: ${result}`);
    }

    // Step 3: Synthesize final response
    const finalContext = toolOutputs.join('\n\n');
    return await this.synthesize(skill, query, finalContext, context, LLMConnector, user);
  }

  async planTools(skill, query, context, LLMConnector, user) {
    // 1) Get intrinsic allowed tools from the skill
    const skillAllowedTools = skill.allowed_tools || [];
    let allowedTools = skillAllowedTools.join(', ');

    // 2) Dynamically discover MCP tools
    const MCPCompatibilityLayer = require("../utils/MCP");
    const mcpLayer = new MCPCompatibilityLayer();
    const activeServers = await mcpLayer.servers();
    let mcpToolsSchema = "";
    
    for (const server of activeServers) {
      if (server.running && server.tools && server.tools.length > 0) {
        for (const tool of server.tools) {
          const mcpToolName = `@@mcp_${server.name}_${tool.name}`;
          const isAllowed = skillAllowedTools.includes(mcpToolName) || skillAllowedTools.includes('*') || skillAllowedTools.includes('mcp_all');
          if (isAllowed) {
            allowedTools += `${allowedTools ? ', ' : ''}${mcpToolName}`;
            mcpToolsSchema += `\nMCP Tool: ${mcpToolName}\nDescription: ${tool.description}\nJSON Schema Args: ${JSON.stringify(tool.inputSchema)}\n`;
          }
        }
      }
    }

    if (!allowedTools) allowedTools = 'None';

    const prompt = `You are an agent executing the "${skill.name}" skill.
Instructions:
${skill.body}

Allowed Tools: ${allowedTools}
${mcpToolsSchema ? `\nAvailable MCP Tools Details:\n${mcpToolsSchema}` : ''}
Conversation Context: ${context}

User Query: ${query}

Produce a JSON execution plan using ONLY allowed tools. Ensure all newlines inside JSON strings are strictly escaped as \\n.
Format:
{
  "plan_description": "step-by-step reasoning",
  "tool_calls": [{"tool": "name", "args": {"arg1": "val1"}}]
}`;

    const messages = [{ role: "system", content: prompt }, { role: "user", content: "Generate JSON plan." }];
    try {
      const { textResponse } = await LLMConnector.getChatCompletion(messages, { temperature: 0.1, user });
      let cleanJson = textResponse.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
      
      try {
        return JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn("[doom-agent] JSON.parse failed due to bad formatting, running strict sanitizer...", parseErr.message);
        let inString = false;
        let isEscaped = false;
        let sanitized = "";
        for (let i = 0; i < cleanJson.length; i++) {
          let char = cleanJson[i];
          if (inString) {
            if (char === '\n') sanitized += '\\n';
            else if (char === '\r') sanitized += '\\r';
            else if (char === '\t') sanitized += '\\t';
            else if (char === '\\') {
              isEscaped = !isEscaped;
              sanitized += char;
            } else if (char === '"' && !isEscaped) {
              inString = false;
              sanitized += char;
            } else {
              isEscaped = false;
              sanitized += char;
            }
          } else {
            if (char === '"') {
              inString = true;
              isEscaped = false;
            }
            sanitized += char;
          }
        }
        return JSON.parse(sanitized);
      }
    } catch (e) {
      console.error("[doom-agent] Planner error:", e);
      return null;
    }
  }

  async executeToolWithRetry(call, skill, workspace, user, attempt = 1) {
    if (!skill.allowed_tools.includes(call.tool) && !skill.allowed_tools.includes('*') && !skill.allowed_tools.includes('mcp_all')) {
      return `Error: Tool ${call.tool} is not allowed for this skill.`;
    }

    try {
      let output;
      
      // Intercept MCP server calls
      if (call.tool.startsWith("@@mcp_")) {
        const MCPCompatibilityLayer = require("../utils/MCP");
        const mcpLayer = new MCPCompatibilityLayer();
        // format is @@mcp_{server}_{toolName}
        // However server names or tool names can have underscores.
        // Quickest parsing:
        const toolStr = call.tool.replace("@@mcp_", "");
        
        let targetServerName = null;
        let targetToolName = null;
        
        // Match against active servers to accurately slice the names
        await mcpLayer.servers(); // ensures loaded
        const servers = Object.keys(mcpLayer.mcps);
        for (const s of servers) {
          if (toolStr.startsWith(`${s}_`)) {
            targetServerName = s;
            targetToolName = toolStr.replace(`${s}_`, "");
            break;
          }
        }
        
        if (!targetServerName || !targetToolName) {
           return `Error: MCP server or tool not found for ${call.tool}`;
        }
        
        const mcpServer = mcpLayer.mcps[targetServerName];
        if (!mcpServer) return `Error: MCP server ${targetServerName} is not running.`;
        
        console.log(`[doom-agent] Executing MCP tool ${targetServerName}:${targetToolName} with args:`, call.args);
        
        const result = await mcpServer.callTool({
            name: targetToolName,
            arguments: call.args
        });
        
        output = MCPCompatibilityLayer.returnMCPResult(result);
      } else {
        const toolFn = toolsRegistry[call.tool];
        if (!toolFn) {
          return `Error: Tool ${call.tool} not found in registry.`;
        }
        
        if (call.tool === 'delegate') {
          const instructions = call.args.instructions || call.args.instruction || call.args.new_instructions;
          const targetSkill = call.args.target_skill || call.args.targetSkill || call.args.skill;
          console.log(`[doom-agent] delegate args:`, call.args);
          output = await toolFn(instructions, targetSkill, { workspace, user });
        } else if (call.tool === 'mutate_skill') {
          const newInstructions = call.args.new_instructions || call.args.newInstructions || call.args.instructions || call.args.content || Object.values(call.args)[0];
          const targetSkill = call.args.target_skill || call.args.targetSkill || call.args.skill || call.args.skill_name || "self-optimizer";
          console.log(`[doom-agent] mutate_skill args:`, call.args);
          output = await toolFn(newInstructions, targetSkill);
        } else {
          const args = { ...call.args, workspace };
          output = await toolFn(args);
        }
      }
      
      return typeof output === 'object' ? JSON.stringify(output) : output;
    } catch (e) {
      if (attempt <= this.config.maxRetries) {
        console.log(`[doom-agent] Tool ${call.tool} failed, retrying (${attempt}/${this.config.maxRetries})... err: ${e.message}`);
        return await this.executeToolWithRetry(call, skill, workspace, user, attempt + 1);
      }
      return `Error executing tool ${call.tool}: ${e.message}`;
    }
  }

  async synthesize(skill, query, toolContext, priorContext, LLMConnector, user) {
    const prompt = `You are completing the "${skill.name}" skill request.
Based on the tool outputs below, formulate a complete and coherent response to the user's query.

Tool Outputs:
${toolContext}

Past Context:
${priorContext}

Answer the user directly regarding their query: "${query}"`;

    const messages = [{ role: "system", content: prompt }, { role: "user", content: query }];
    try {
      const { textResponse } = await LLMConnector.getChatCompletion(messages, { temperature: 0.7, user });
      return textResponse;
    } catch (e) {
      console.error("[doom-agent] Synthesis error:", e);
      return "An error occurred while synthesizing the response.";
    }
  }
}

module.exports = SkillRunner;
