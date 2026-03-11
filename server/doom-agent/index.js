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

  async intercept(message, integrationContext) {
    if (!config.enabled) return null; // Bypass

    const { workspace, user, sessionId, chatMode, response } = integrationContext;
    
    // 1. Get Memory Context
    const historyContext = await this.memory.getContext(message, sessionId, user?.id);

    // 2. Select Skill
    const selection = await this.selector.selectSkill(message, workspace, user, chatMode);
    
    if (!selection || !selection.skill) {
      // Fallback: Store query in memory and let AnythingLLM handle it
      return null;
    }

    // Skill matched! Prepare streaming or sync response hijack
    console.log(`[doom-agent] Match: ${selection.skill.name} (Conf: ${selection.confidence})`);
    
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
      const { WorkspaceChats } = require("../../models/workspaceChats");

      // Save to WorkspaceChats for AnythingLLM history
      const { chat } = await WorkspaceChats.new({
        workspaceId: workspace.id,
        prompt: message,
        response: {
          text: finalAnswer,
          sources: [],
          type: chatMode,
          metrics: {},
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
        metrics: {}
      });

      writeResponseChunk(response, {
        uuid,
        type: "finalizeResponseStream",
        close: true,
        error: false,
        chatId: chat.id,
        metrics: {},
        sources: [],
      });
      response.end();
      return true; // Used to tell parent NOT to continue
    } else {
      // Sync interface
      return {
        id: uuid,
        type: "textResponse",
        close: true,
        error: null,
        textResponse: finalAnswer,
        sources: [],
        metrics: {}
      };
    }
  }
}

const instance = new UniversalAgent();
module.exports = instance;
