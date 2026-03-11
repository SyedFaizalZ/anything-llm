const { getLLMProvider } = require("../utils/helpers");

class SkillSelector {
  constructor(registry) {
    this.registry = registry;
  }

  async selectSkill(query, workspace, user, chatMode) {
    const allSkills = this.registry.listSkills();
    if (allSkills.length === 0) return null;

    const LLMConnector = getLLMProvider({
      provider: workspace?.chatProvider,
      model: workspace?.chatModel,
    });

    if (allSkills.length > 10) {
      const category = await this.stage1CategorySelection(query, LLMConnector, user);
      if (!category) return null;
      const categorySkills = this.registry.categories.get(category) || [];
      const candidateSkills = categorySkills.map(name => this.registry.getSkill(name));
      return await this.stage2SkillSelection(query, candidateSkills, LLMConnector, user);
    } else {
      return await this.stage2SkillSelection(query, allSkills, LLMConnector, user);
    }
  }

  async stage1CategorySelection(query, LLMConnector, user) {
    const categoriesInfo = this.registry.listCategories().map(c => 
      `- ${c}: ${this.registry.categories.get(c).length} skills`
    ).join('\n');

    const prompt = `You are a router. Based on the user query, select the most relevant skill category from the list.
Categories:
${categoriesInfo}

Return ONLY the category name. If none fit, return "none".`;

    const messages = [{ role: "system", content: prompt }, { role: "user", content: query }];
    try {
      const { textResponse } = await LLMConnector.getChatCompletion(messages, { temperature: 0.1, user });
      const cat = textResponse.trim().toLowerCase();
      return this.registry.listCategories().includes(cat) ? cat : null;
    } catch (e) {
      console.error("[doom-agent] Error in category selection:", e);
      return null;
    }
  }

  async stage2SkillSelection(query, candidates, LLMConnector, user) {
    const candidatesStr = candidates.map(s => 
      `Name: ${s.name}\nDescription: ${s.description}\nTriggers: ${s.triggers.join(', ')}\nNegative Triggers: ${s.negative_triggers.join(', ')}`
    ).join('\n\n');

    const prompt = `You are a skill router. Given the user query and candidate skills, select the single best skill.
Candidate Skills:
${candidatesStr}

Respond with a JSON object in exactly this format:
{"skill_name": "exact_name_from_list_or_none", "confidence": <float_between_0_and_1>}
If no skill is a good fit, return {"skill_name": "none", "confidence": 0.0}`;

    const messages = [{ role: "system", content: prompt }, { role: "user", content: query }];
    try {
      const { textResponse } = await LLMConnector.getChatCompletion(messages, { temperature: 0.1, user });
      
      const cleanJson = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const result = JSON.parse(cleanJson);
      
      if (result.skill_name === "none" || result.confidence < 0.5) return null;
      
      return { skill: this.registry.getSkill(result.skill_name), confidence: result.confidence };
    } catch (e) {
      console.error("[doom-agent] Error in skill selection:", e);
      return null;
    }
  }
}

module.exports = SkillSelector;
