const config = require('./config');
const registry = require('./skill_registry');
const SkillSelector = require('./skill_selector');
const SkillRunner = require('./skill_runner');
const MemoryManager = require('./memory');

class UniversalAgent {
  constructor() {
    this.registry = registry;
    this.selector = new SkillSelector(this.registry);
    this.runner = new SkillRunner(config);
    this.memory = new MemoryManager(config);
    
    // Auto-init registry if enabled
    this.registry.init();
  }

  /**
   * Get mem0 memory context for a query.
   * Called by the chat endpoint to inject memories even when doom-agent doesn't intercept.
   */
  async getMemoryContext(message, userId) {
    return await this.memory.getContext(message, null, userId);
  }

  /**
   * Save a message/response pair to mem0 memory.
   * Called by the chat endpoint after the regular LLM responds.
   */
  async saveMemory(message, response, sessionId, userId) {
    await this.memory.saveInteraction(message, response, sessionId, userId);
  }

  async intercept(message, integrationContext) {
    if (!config.enabled) {
      console.log("[doom-agent] Agent disabled, skipping intercept");
      return null;
    }

    const { workspace, user, sessionId, chatMode, response } = integrationContext;
    console.log(`[doom-agent] Intercept called for message: "${message.substring(0, 60)}..."`);
    console.log(`[doom-agent] Workspace LLM: ${workspace?.chatProvider} / ${workspace?.chatModel}`);
    
    // 1. Get Memory Context (always, even if no skill matches)
    const historyContext = await this.memory.getContext(message, sessionId, user?.id);

    // 2. Select Skill
    console.log(`[doom-agent] Attempting skill selection...`);
    const selection = await this.selector.selectSkill(message, workspace, user, chatMode);
    
    if (!selection || !selection.skill) {
      console.log(`[doom-agent] No skill matched for message`);
      // No skill matched — but still save to mem0 in the background
      // (the chat endpoint will call saveMemory after the LLM responds)
      return null;
    }

    // Skill matched! Prepare streaming or sync response hijack
    console.log(`[doom-agent] Match: ${selection.skill.name} (Conf: ${selection.confidence})`);
    console.log(`[doom-agent] Executing skill: ${selection.skill.name}`);
    
    // We notify frontend we intercepted (optional streaming artifact)
    if (response) {
       // Send an indicator or just wait
    }

    // 3. Run Skill
    const finalAnswer = await this.runner.run(
      selection.skill, 
      message, 
      historyContext, 
      workspace, 
      user
    );

    // 4. Update Memory
    await this.memory.saveInteraction(message, finalAnswer, sessionId, user?.id);

    // 5. Construct AnythingLLM compatible return object
    const { v4: uuidv4 } = require("uuid");
    const uuid = uuidv4();

    if (response) {
      // Stream interface expected
      const { writeResponseChunk } = require("../utils/helpers/chat/responses");
      const { WorkspaceChats } = require("../models/workspaceChats");

      // Save to WorkspaceChats for AnythingLLM history
      const doomMetrics = {
        model: `Universal Agent (Skill: ${selection.skill.name})`,
        duration: 0.1, // Small mock duration just to trigger frontend rendering
        outputTps: 100 // Mock tps just to trigger frontend rendering
      };

      const { chat } = await WorkspaceChats.new({
        workspaceId: workspace.id,
        prompt: message,
        response: {
          text: finalAnswer,
          sources: [],
          type: chatMode,
          metrics: doomMetrics,
          attachments: []
        },
        threadId: integrationContext.thread?.id || null,
        apiSessionId: sessionId,
        user
      });

      writeResponseChunk(response, {
        uuid,
        sources: [],
        type: "textResponseChunk",
        textResponse: finalAnswer,
        close: true,
        error: false,
        metrics: doomMetrics
      });

      writeResponseChunk(response, {
        uuid,
        type: "finalizeResponseStream",
        close: true,
        error: false,
        chatId: chat.id,
        metrics: doomMetrics,
        sources: [],
      });
      response.end();
      return true; // Used to tell parent NOT to continue
    } else {
      // Sync interface
      const doomMetrics = {
        model: `Universal Agent (Skill: ${selection.skill.name})`,
        duration: 0.1,
        outputTps: 100
      };

      return {
        id: uuid,
        type: "textResponse",
        close: true,
        error: null,
        textResponse: finalAnswer,
        sources: [],
        metrics: doomMetrics
      };
    }
  }
}

const instance = new UniversalAgent();
module.exports = instance;
