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
  
  // GET current config - Reads from process.env with database fallback
  doomRouter.get("/config", async (request, response) => {
    try {
      console.log("[Doom Agent] GET /config - Fetching current configuration");
      
      // Check environment variables first (runtime values)
      let config = {
        DOOM_AGENT_ENABLED: process.env.DOOM_AGENT_ENABLED === "true",
        DOOM_AGENT_CONFIDENCE_THRESHOLD: process.env.DOOM_AGENT_CONFIDENCE_THRESHOLD || "0.5",
        DOOM_AGENT_MAX_RETRIES: process.env.DOOM_AGENT_MAX_RETRIES || "2",
        DOOM_AGENT_MEMORY_WINDOW: process.env.DOOM_AGENT_MEMORY_WINDOW || "5",
        E2B_API_KEY: process.env.E2B_API_KEY || "",
        E2B_EXECUTION_MODE: process.env.E2B_EXECUTION_MODE || "api",
        LLM_API_BASE: process.env.LLM_API_BASE || "",
        CHROMA_URL: process.env.CHROMA_URL || "http://localhost:8000",
        MEM0_API_URL: process.env.MEM0_API_URL || "",
        MEM0_API_KEY: process.env.MEM0_API_KEY || "",
        MEM0_USER_ID: process.env.MEM0_USER_ID || "default",
        MEM0_EXECUTION_MODE: process.env.MEM0_EXECUTION_MODE || "api",
      };

      console.log("[Doom Agent] GET - process.env values:", {
        E2B_API_KEY_LENGTH: process.env.E2B_API_KEY?.length || 0,
        E2B_EXECUTION_MODE: process.env.E2B_EXECUTION_MODE || "api",
        LLM_API_BASE: process.env.LLM_API_BASE || "(empty)",
        MEM0_API_URL: process.env.MEM0_API_URL || "(empty)",
        MEM0_API_KEY_LENGTH: process.env.MEM0_API_KEY?.length || 0,
      });

      // If values are empty/default, try to fetch from database
      if (!config.DOOM_AGENT_CONFIDENCE_THRESHOLD || config.DOOM_AGENT_CONFIDENCE_THRESHOLD === "0.5") {
        const dbValue = await SystemSettings.getValueOrFallback(
          { label: "doom_agent_confidence_threshold" },
          "0.5"
        );
        if (dbValue) {
          config.DOOM_AGENT_CONFIDENCE_THRESHOLD = dbValue;
          console.log("[Doom Agent] GET - Loaded confidence_threshold from DB:", dbValue);
        }
      }

      if (!config.E2B_API_KEY) {
        const dbValue = await SystemSettings.getValueOrFallback(
          { label: "e2b_api_key" },
          ""
        );
        console.log("[Doom Agent] GET - DB e2b_api_key:", dbValue ? `(length ${dbValue.length})` : "(not in DB)");
        if (dbValue) {
          config.E2B_API_KEY = dbValue;
          console.log("[Doom Agent] GET - Loaded e2b_api_key from DB (length):", dbValue?.length || 0);
        }
      }

      if (!config.MEM0_API_URL) {
        const dbValue = await SystemSettings.getValueOrFallback(
          { label: "mem0_api_url" },
          ""
        );
        console.log("[Doom Agent] GET - DB mem0_api_url:", dbValue || "(not in DB)");
        if (dbValue) {
          config.MEM0_API_URL = dbValue;
          console.log("[Doom Agent] GET - Loaded mem0_api_url from DB:", dbValue);
        }
      }

      if (!config.MEM0_API_KEY) {
        const dbValue = await SystemSettings.getValueOrFallback(
          { label: "mem0_api_key" },
          ""
        );
        console.log("[Doom Agent] GET - DB mem0_api_key:", dbValue ? `(length ${dbValue.length})` : "(not in DB)");
        if (dbValue) {
          config.MEM0_API_KEY = dbValue;
          console.log("[Doom Agent] GET - Loaded mem0_api_key from DB (length):", dbValue?.length || 0);
        }
      }

      console.log("[Doom Agent] GET /config - Returning config:", JSON.stringify(config, null, 2));
      response.status(200).json(config);
    } catch (e) {
      console.error("[Doom Agent] GET /config ERROR:", e.message, e.stack);
      response.status(500).json({ error: "Could not fetch configuration - " + e.message });
    }
  });

  // POST update config - Uses SystemSettings database (source of truth like all other AnythingLLM configs)
  doomRouter.post("/config", async (request, response) => {
    try {
      // Parse body if it comes as a string instead of object (middleware issue fallback)
      let updates = request.body;
      if (typeof updates === 'string') {
        try {
          updates = JSON.parse(updates);
          console.log("[Doom Agent] POST /config - Parsed JSON string body");
        } catch (e) {
          console.error("[Doom Agent] Failed to parse body as JSON:", e.message);
          return response.status(400).json({ error: "Invalid JSON in request body" });
        }
      }
      
      console.log("[Doom Agent] POST /config - Incoming updates (parsed):", JSON.stringify(updates, null, 2));
      
      // Transform frontend keys (UPPERCASE_SNAKE) to database keys (lowercase_snake)
      const dbPayload = {};
      
      if (updates.DOOM_AGENT_ENABLED !== undefined) {
        dbPayload.doom_agent_enabled = String(updates.DOOM_AGENT_ENABLED);
        console.log("[Doom Agent] Mapping DOOM_AGENT_ENABLED:", updates.DOOM_AGENT_ENABLED, "-> doom_agent_enabled:", dbPayload.doom_agent_enabled);
      }
      if (updates.DOOM_AGENT_CONFIDENCE_THRESHOLD !== undefined) {
        dbPayload.doom_agent_confidence_threshold = String(updates.DOOM_AGENT_CONFIDENCE_THRESHOLD);
        console.log("[Doom Agent] Mapping confidence threshold:", updates.DOOM_AGENT_CONFIDENCE_THRESHOLD);
      }
      if (updates.DOOM_AGENT_MAX_RETRIES !== undefined) {
        dbPayload.doom_agent_max_retries = String(updates.DOOM_AGENT_MAX_RETRIES);
        console.log("[Doom Agent] Mapping max retries:", updates.DOOM_AGENT_MAX_RETRIES);
      }
      if (updates.DOOM_AGENT_MEMORY_WINDOW !== undefined) {
        dbPayload.doom_agent_memory_window = String(updates.DOOM_AGENT_MEMORY_WINDOW);
        console.log("[Doom Agent] Mapping memory window:", updates.DOOM_AGENT_MEMORY_WINDOW);
      }
      if (updates.E2B_API_KEY !== undefined) {
        dbPayload.e2b_api_key = updates.E2B_API_KEY || "";
        console.log("[Doom Agent] Mapping E2B key (length):", updates.E2B_API_KEY?.length || 0);
      }
      if (updates.E2B_EXECUTION_MODE !== undefined) {
        dbPayload.e2b_execution_mode = updates.E2B_EXECUTION_MODE || "api";
        console.log("[Doom Agent] Mapping E2B execution mode:", updates.E2B_EXECUTION_MODE);
      }
      if (updates.LLM_API_BASE !== undefined) {
        dbPayload.llm_api_base = updates.LLM_API_BASE || "";
        console.log("[Doom Agent] Mapping LLM API Base:", updates.LLM_API_BASE || "(empty)");
      }
      if (updates.CHROMA_URL !== undefined) {
        dbPayload.chroma_url = updates.CHROMA_URL || "http://localhost:8000";
        console.log("[Doom Agent] Mapping Chroma URL:", updates.CHROMA_URL);
      }
      if (updates.MEM0_API_URL !== undefined) {
        dbPayload.mem0_api_url = updates.MEM0_API_URL || "";
        console.log("[Doom Agent] Mapping Mem0 URL:", updates.MEM0_API_URL || "(empty)");
      }
      if (updates.MEM0_API_KEY !== undefined) {
        dbPayload.mem0_api_key = updates.MEM0_API_KEY || "";
        console.log("[Doom Agent] Mapping Mem0 API key (length):", updates.MEM0_API_KEY?.length || 0);
      }
      if (updates.MEM0_USER_ID !== undefined) {
        dbPayload.mem0_user_id = updates.MEM0_USER_ID || "default";
        console.log("[Doom Agent] Mapping Mem0 User ID:", updates.MEM0_USER_ID || "default");
      }
      if (updates.MEM0_EXECUTION_MODE !== undefined) {
        dbPayload.mem0_execution_mode = updates.MEM0_EXECUTION_MODE || "api";
        console.log("[Doom Agent] Mapping Mem0 execution mode:", updates.MEM0_EXECUTION_MODE);
      }

      console.log("[Doom Agent] DB payload to save:", JSON.stringify(dbPayload, null, 2));

      // Use SystemSettings to save to database (this is the SOURCE OF TRUTH)
      const { success, error } = await SystemSettings.updateSettings(dbPayload);
      
      if (!success) {
        console.error("[Doom Agent] FAILED to save settings to database:", error);
        return response.status(500).json({ error: error || "Failed to save settings to database" });
      }
      
      console.log("[Doom Agent] Successfully saved settings to database");

      // Update process.env so running configuration is current
      if (dbPayload.doom_agent_enabled !== undefined) {
        process.env.DOOM_AGENT_ENABLED = String(dbPayload.doom_agent_enabled);
      }
      if (dbPayload.doom_agent_confidence_threshold !== undefined) {
        process.env.DOOM_AGENT_CONFIDENCE_THRESHOLD = String(dbPayload.doom_agent_confidence_threshold);
      }
      if (dbPayload.doom_agent_max_retries !== undefined) {
        process.env.DOOM_AGENT_MAX_RETRIES = String(dbPayload.doom_agent_max_retries);
      }
      if (dbPayload.doom_agent_memory_window !== undefined) {
        process.env.DOOM_AGENT_MEMORY_WINDOW = String(dbPayload.doom_agent_memory_window);
      }
      if (dbPayload.e2b_api_key !== undefined) {
        process.env.E2B_API_KEY = String(dbPayload.e2b_api_key);
      }
      if (dbPayload.e2b_execution_mode !== undefined) {
        process.env.E2B_EXECUTION_MODE = String(dbPayload.e2b_execution_mode);
      }
      if (dbPayload.llm_api_base !== undefined) {
        process.env.LLM_API_BASE = String(dbPayload.llm_api_base);
      }
      if (dbPayload.chroma_url !== undefined) {
        process.env.CHROMA_URL = String(dbPayload.chroma_url);
      }
      if (dbPayload.mem0_api_url !== undefined) {
        process.env.MEM0_API_URL = String(dbPayload.mem0_api_url);
      }
      if (dbPayload.mem0_api_key !== undefined) {
        process.env.MEM0_API_KEY = String(dbPayload.mem0_api_key);
      }
      if (dbPayload.mem0_user_id !== undefined) {
        process.env.MEM0_USER_ID = String(dbPayload.mem0_user_id);
      }
      if (dbPayload.mem0_execution_mode !== undefined) {
        process.env.MEM0_EXECUTION_MODE = String(dbPayload.mem0_execution_mode);
      }

      console.log("[Doom Agent] Updated process.env with new values");

      // Reload config from database to pick up new values
      try {
        await config.loadSettingsFromDB();
        console.log("[Doom Agent] Reloaded config from database");
      } catch (e) {
        console.warn("[Doom Agent] Failed to reload config from DB (continuing anyway):", e.message);
      }

      // Update static properties
      config.enabled = process.env.DOOM_AGENT_ENABLED === "true";
      if (dbPayload.doom_agent_confidence_threshold) {
        config.confidenceThreshold = parseFloat(dbPayload.doom_agent_confidence_threshold);
      }
      if (dbPayload.doom_agent_max_retries) {
        config.maxRetries = parseInt(dbPayload.doom_agent_max_retries, 10);
      }
      if (dbPayload.doom_agent_memory_window) {
        config.memoryWindow = parseInt(dbPayload.doom_agent_memory_window, 10);
      }

      console.log("[Doom Agent] Updated config object with new values");

      // Initialize registry if needed
      if (config.enabled && !registry.watcher) {
        console.log("[Doom Agent] Registry not active - initializing now");
        registry.init();
      }

      console.log("[Doom Agent] Configuration update complete - returning success");
      response.status(200).json({ success: true, settings: dbPayload });
    } catch (e) {
      console.error("[Doom Agent] EXCEPTION during config save:", e.message, e.stack);
      response.status(500).json({ error: "Failed to update configuration - " + e.message });
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
