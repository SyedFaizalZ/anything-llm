const express = require("express");
const { SystemSettings } = require("../models/systemSettings");
const { updateENV } = require("../utils/helpers/updateENV");
const { Telemetry } = require("../models/telemetry");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const registry = require("../doom-agent/skill_registry");
const config = require("../doom-agent/config");
const fs = require("fs");
const path = require("path");

function doomAgentEndpoints(router) {
  const doomRouter = express.Router();
  
  // ============================================
  // Settings Management
  // ============================================
  
  // GET current config (reading from process.env to ensure sync)
  doomRouter.get("/config", async (request, response) => {
    try {
      const currentConfig = {
        DOOM_AGENT_ENABLED: process.env.DOOM_AGENT_ENABLED === "true",
        DOOM_AGENT_CONFIDENCE_THRESHOLD: process.env.DOOM_AGENT_CONFIDENCE_THRESHOLD || "0.5",
        DOOM_AGENT_MAX_RETRIES: process.env.DOOM_AGENT_MAX_RETRIES || "2",
        DOOM_AGENT_MEMORY_WINDOW: process.env.DOOM_AGENT_MEMORY_WINDOW || "5",
        E2B_API_KEY: process.env.E2B_API_KEY || "",
        MEM0_API_URL: process.env.MEM0_API_URL || "",
        MEM0_API_KEY: process.env.MEM0_API_KEY || "",
        MEM0_USER_ID: process.env.MEM0_USER_ID || "default",
      };
      response.status(200).json(currentConfig);
    } catch (e) {
      console.error(e);
      response.status(500).json({ error: "Could not fetch configuration" });
    }
  });

  // POST update config
  doomRouter.post("/config", async (request, response) => {
    try {
      const updates = request.body;
      const { newValues, error } = updateENV(updates);
      if (error) {
        return response.status(400).json({ error });
      }
      
      // Update DB copy as well
      await SystemSettings.updateSettings(updates);
      
      // Live reload our agent config
      config.enabled = process.env.DOOM_AGENT_ENABLED === 'true';
      if (updates.DOOM_AGENT_CONFIDENCE_THRESHOLD) config.confidenceThreshold = parseFloat(updates.DOOM_AGENT_CONFIDENCE_THRESHOLD);
      if (updates.DOOM_AGENT_MAX_RETRIES) config.maxRetries = parseInt(updates.DOOM_AGENT_MAX_RETRIES, 10);
      if (updates.DOOM_AGENT_MEMORY_WINDOW) config.memoryWindow = parseInt(updates.DOOM_AGENT_MEMORY_WINDOW, 10);
      if (updates.E2B_API_KEY !== undefined) config.e2bApiKey = updates.E2B_API_KEY;
      if (updates.MEM0_API_URL !== undefined) config.mem0ApiUrl = updates.MEM0_API_URL;
      if (updates.MEM0_API_KEY !== undefined) config.mem0ApiKey = updates.MEM0_API_KEY;

      // Ensure registry is active
      if (config.enabled && !registry.watcher) {
        registry.init();
      }

      response.status(200).json({ success: true, newValues });
    } catch (e) {
      console.error(e);
      response.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // ============================================
  // Skills Management
  // ============================================
  
  // GET all skills
  doomRouter.get("/skills", async (request, response) => {
    try {
      if (config.enabled && !registry.watcher) registry.init(); 
      const skills = registry.listSkills();
      response.status(200).json({ skills });
    } catch (e) {
      response.status(500).json({ error: e.message });
    }
  });

  // GET specific skill content
  doomRouter.get("/skills/:folderName", async (request, response) => {
    try {
      const { folderName } = request.params;
      const skillsDir = path.resolve(config.skillsPath);
      const skillPath = path.join(skillsDir, folderName, 'SKILL.md');
      
      if (!fs.existsSync(skillPath)) {
        return response.status(404).json({ error: "Skill not found" });
      }
      
      const content = fs.readFileSync(skillPath, 'utf-8');
      response.status(200).json({ content });
    } catch (e) {
      response.status(500).json({ error: e.message });
    }
  });

  // POST create or update skill
  doomRouter.post("/skills/:folderName", async (request, response) => {
    try {
      const { folderName } = request.params;
      const { content } = request.body;
      
      if (!content) return response.status(400).json({ error: "Content is required" });
      
      const skillsDir = path.resolve(config.skillsPath);
      const skillFolder = path.join(skillsDir, folderName);
      const skillPath = path.join(skillFolder, 'SKILL.md');
      
      // Ensure folder exists
      if (!fs.existsSync(skillFolder)) {
        fs.mkdirSync(skillFolder, { recursive: true });
      }
      
      fs.writeFileSync(skillPath, content, 'utf-8');
      
      // Force reload in registry immediately
      registry.parseSkill(skillPath, folderName);
      
      response.status(200).json({ success: true });
    } catch (e) {
      response.status(500).json({ error: e.message });
    }
  });

  // DELETE skill
  doomRouter.delete("/skills/:folderName", async (request, response) => {
    try {
      const { folderName } = request.params;
      const skillsDir = path.resolve(config.skillsPath);
      const skillFolder = path.join(skillsDir, folderName);
      
      if (fs.existsSync(skillFolder)) {
        fs.rmSync(skillFolder, { recursive: true, force: true });
        
        // Remove from registry memory
        registry.skills.delete(folderName);
        for (const [cat, items] of registry.categories.entries()) {
          registry.categories.set(cat, items.filter(n => n !== folderName));
        }
      }
      
      response.status(200).json({ success: true });
    } catch (e) {
      response.status(500).json({ error: e.message });
    }
  });

  router.use("/doom-agent", doomRouter);
}

module.exports = { doomAgentEndpoints };
