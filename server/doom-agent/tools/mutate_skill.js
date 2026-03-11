const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('../config');

// Replaces the markdown instruction body of a skill while preserving frontmatter
async function mutateSkill(newInstructions, targetSkillName) {
  try {
    const skillsDir = path.resolve(config.skillsPath);
    const skillPath = path.join(skillsDir, targetSkillName, 'SKILL.md');
    
    if (!fs.existsSync(skillPath)) {
      return { 
        error: `Mutation failed. Skill '${targetSkillName}' does not exist.` 
      };
    }

    const content = fs.readFileSync(skillPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!match) {
      return { error: `Mutation failed. Invalid SKILL.md format in ${targetSkillName}` };
    }
    
    // Save backup just in case the AI messes up its own prompt
    const backupPath = path.join(skillsDir, targetSkillName, `SKILL.backup-${Date.now()}.md`);
    fs.writeFileSync(backupPath, content, 'utf-8');
    
    const frontmatter = match[1];
    
    // Reconstruct file with exact same frontmatter but NEW instructions
    const newContent = `---\n${frontmatter}\n---\n\n${newInstructions}`;
    
    fs.writeFileSync(skillPath, newContent, 'utf-8');
    
    return { success: `Successfully mutated skill '${targetSkillName}'. A backup was saved just in case.` };

  } catch (error) {
    console.error('[doom-agent][mutate] Error:', error);
    return { error: error.message };
  }
}

function getDefinition() {
  return `
Tool: mutate_skill
Description: Permanently overwrites and updates the markdown instruction prompt (the core logic/rules) of an existing skill. Use this to permanently 'learn' a new behavior or rule so you remember it forever by literally rewriting your own code.
WARNING: This completely replaces the instruction block below the frontmatter. You must provide the FULL updated instructions, including all previous rules you want to keep, plus the new ones.
Parameters:
  - new_instructions (string): The complete, updated markdown instruction block to replace the current one.
  - target_skill (string): The folder name of the skill to rewrite (e.g., 'write-blog').
Returns: Success or error message.
`;
}

module.exports = {
  mutate_skill: {
    execute: (newInstructions, targetSkillName) => mutateSkill(newInstructions, targetSkillName),
    definition: getDefinition()
  }
};
