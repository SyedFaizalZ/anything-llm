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
      const result = await this.executeToolWithRetry(call, skill, workspace);
      toolOutputs.push(`[${call.tool}] Output: ${result}`);
    }

    // Step 3: Synthesize final response
    const finalContext = toolOutputs.join('\n\n');
    return await this.synthesize(skill, query, finalContext, context, LLMConnector, user);
  }

  async planTools(skill, query, context, LLMConnector, user) {
    const allowedTools = skill.allowed_tools.join(', ') || 'None';
    const prompt = `You are an agent executing the "${skill.name}" skill.
Instructions:
${skill.body}

Allowed Tools: ${allowedTools}
Conversation Context: ${context}

User Query: ${query}

Produce a JSON execution plan using ONLY allowed tools.
Format:
{
  "plan_description": "step-by-step reasoning",
  "tool_calls": [{"tool": "name", "args": {"arg1": "val1"}}]
}`;

    const messages = [{ role: "system", content: prompt }, { role: "user", content: "Generate JSON plan." }];
    try {
      const { textResponse } = await LLMConnector.getChatCompletion(messages, { temperature: 0.1, user });
      const cleanJson = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("[doom-agent] Planner error:", e);
      return null;
    }
  }

  async executeToolWithRetry(call, skill, workspace, attempt = 1) {
    if (!skill.allowed_tools.includes(call.tool)) {
      return `Error: Tool ${call.tool} is not allowed for this skill.`;
    }

    const toolFn = toolsRegistry[call.tool];
    if (!toolFn) {
      return `Error: Tool ${call.tool} not found in registry.`;
    }

    try {
      // Inject Workspace context for tools that need it
      let output;
      
      if (call.tool === 'delegate') {
        output = await toolFn(call.args.instructions, call.args.target_skill, { workspace, user });
      } else if (call.tool === 'mutate_skill') {
        output = await toolFn(call.args.new_instructions, call.args.target_skill);
      } else {
        const args = { ...call.args, workspace };
        output = await toolFn(args);
      }
      
      return typeof output === 'object' ? JSON.stringify(output) : output;
    } catch (e) {
      if (attempt <= this.config.maxRetries) {
        console.log(`[doom-agent] Tool ${call.tool} failed, retrying (${attempt}/${this.config.maxRetries})...`);
        return await this.executeToolWithRetry(call, skill, workspace, attempt + 1);
      }
      return `Error executing tool: ${e.message}`;
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
