const { getLLMProvider } = require("../utils/helpers");

class SkillSelector {
  constructor(registry) {
    this.registry = registry;
  }

  async selectSkill(query, workspace, user, chatMode) {
    const allSkills = this.registry.listSkills();
    console.log(`[doom-agent] Available skills: ${allSkills.map(s => s.name).join(', ')}`);
    
    if (allSkills.length === 0) {
      console.warn(`[doom-agent] No skills registered!`);
      return null;
    }

    try {
      const LLMConnector = getLLMProvider({
        provider: workspace?.chatProvider,
        model: workspace?.chatModel,
      });
      console.log(`[doom-agent] Got LLM connector for: ${workspace?.chatProvider} / ${workspace?.chatModel}`);

      if (allSkills.length > 10) {
        const category = await this.stage1CategorySelection(query, LLMConnector, user);
        if (!category) return null;
        const categorySkills = this.registry.categories.get(category) || [];
        const candidateSkills = categorySkills.map(name => this.registry.getSkill(name));
        console.log(`[doom-agent] Category selected: ${category}, candidates: ${candidateSkills.map(s => s.name).join(', ')}`);
        return await this.stage2SkillSelection(query, candidateSkills, LLMConnector, user);
      } else {
        console.log(`[doom-agent] All ${allSkills.length} skills are candidates`);
        return await this.stage2SkillSelection(query, allSkills, LLMConnector, user);
      }
    } catch (e) {
      console.error("[doom-agent] LLM Provider error in selectSkill:", e.message);
      console.error("[doom-agent] Stack trace:", e.stack);
      console.warn("[doom-agent] Falling back to default skill routing (no LLM-based selection)");
      // Fallback: return first skill or null
      return null;
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
    console.log(`[doom-agent] Selecting from ${candidates.length} candidates for query: "${query.substring(0, 60)}..."`);
    
    try {
      const { textResponse } = await LLMConnector.getChatCompletion(messages, { temperature: 0.1, user });
      console.log(`[doom-agent] LLM response: ${textResponse}`);
      
      const cleanJson = textResponse.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(cleanJson);
      console.log(`[doom-agent] Parsed result: skill_name=${result.skill_name}, confidence=${result.confidence}`);
      
      if (result.skill_name === "none" || result.confidence < 0.5) {
        console.log(`[doom-agent] Skill match below threshold (skill=${result.skill_name}, conf=${result.confidence})`);
        return null;
      }
      
      console.log(`[doom-agent] Selected skill: ${result.skill_name} with confidence ${result.confidence}`);
      return { skill: this.registry.getSkill(result.skill_name), confidence: result.confidence };
    } catch (e) {
      console.error("[doom-agent] Error in skill selection:", e.message);
      return null;
    }
  }
}

module.exports = SkillSelector;
