const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('./config');

class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this.categories = new Map();
    this.watcher = null;
  }

  init() {
    if (!config.enabled) return;
    this.skillsDir = path.resolve(config.skillsPath);
    console.log(`[doom-agent] Initializing skill registry from: ${this.skillsDir}`);
    
    if (!fs.existsSync(this.skillsDir)) {
      console.warn(`[doom-agent] Skills directory not found: ${this.skillsDir}`);
      return;
    }
    
    this.loadSkills();
    this.watcher = fs.watch(this.skillsDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('SKILL.md')) {
        console.log(`[doom-agent] Skill changed: ${filename}, reloading...`);
        this.loadSkills();
      }
    });
  }

  loadSkills() {
    this.skills.clear();
    this.categories.clear();
    
    try {
      const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
      console.log(`[doom-agent] Found ${entries.length} entries in skills directory`);
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
          console.log(`[doom-agent] Checking for skill file: ${skillPath}`);
          
          if (fs.existsSync(skillPath)) {
            console.log(`[doom-agent] Loading skill from: ${entry.name}`);
            this.parseSkill(skillPath, entry.name);
          } else {
            console.log(`[doom-agent] No SKILL.md found in: ${entry.name}`);
          }
        }
      }
      console.log(`[doom-agent] Successfully loaded ${this.skills.size} skills across ${this.categories.size} categories: ${Array.from(this.skills.keys()).join(', ')}`);
    } catch (error) {
      console.error('[doom-agent] Error loading skills:', error);
    }
  }

  parseSkill(filePath, folderName) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      // Normalize line endings: convert CRLF to LF for cross-platform support
      content = content.replace(/\r\n/g, '\n');
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      
      if (!match) {
        console.warn(`[doom-agent] Invalid SKILL.md format in ${folderName}`);
        return;
      }
      
      const metadata = yaml.load(match[1]) || {};
      const body = match[2];
      
      const skill = {
        name: metadata.name || folderName,
        description: metadata.description || '',
        triggers: metadata.triggers || [],
        negative_triggers: metadata.negative_triggers || [],
        allowed_tools: metadata.allowed_tools || [],
        category: metadata.category || 'general',
        dependencies: metadata.dependencies || [],
        body: body,
        path: filePath
      };
      
      console.log(`[doom-agent] ✓ Parsed skill: ${skill.name} (category: ${skill.category}, triggers: ${skill.triggers.length})`);
      this.skills.set(skill.name, skill);
      
      if (!this.categories.has(skill.category)) {
        this.categories.set(skill.category, []);
      }
      this.categories.get(skill.category).push(skill.name);
      
    } catch (e) {
      console.error(`[doom-agent] Failed to parse skill at ${filePath}:`, e);
    }
  }

  getSkill(name) {
    return this.skills.get(name);
  }

  listSkills() {
    return Array.from(this.skills.values());
  }

  listCategories() {
    return Array.from(this.categories.keys());
  }
}

// Singleton instance
const registry = new SkillRegistry();
module.exports = registry;
