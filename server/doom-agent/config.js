const path = require('path');
const { SystemSettings } = require('../models/systemSettings');

// Cache to store loaded settings
let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 second cache

async function loadSettingsFromDB() {
  // Return cached value if still fresh
  if (settingsCache && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return settingsCache;
  }

  // Load fresh from database
  try {
    const e2bKey = await SystemSettings.getValueOrFallback({ label: 'e2b_api_key' }, '');
    const e2bMode = await SystemSettings.getValueOrFallback({ label: 'e2b_execution_mode' }, 'api');
    const llmBase = await SystemSettings.getValueOrFallback({ label: 'llm_api_base' }, '');
    const chromaUrl = await SystemSettings.getValueOrFallback({ label: 'chroma_url' }, 'http://localhost:8000');
    const mem0Url = await SystemSettings.getValueOrFallback({ label: 'mem0_api_url' }, '');
    const mem0Key = await SystemSettings.getValueOrFallback({ label: 'mem0_api_key' }, '');
    const mem0Mode = await SystemSettings.getValueOrFallback({ label: 'mem0_execution_mode' }, 'api');

    settingsCache = {
      e2bApiKey: e2bKey || process.env.E2B_API_KEY,
      e2bExecutionMode: e2bMode || process.env.E2B_EXECUTION_MODE || 'api',
      llmApiBase: llmBase || process.env.LLM_API_BASE,
      chromaUrl: chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000',
      mem0ApiUrl: mem0Url || process.env.MEM0_API_URL,
      mem0ApiKey: mem0Key || process.env.MEM0_API_KEY,
      mem0ExecutionMode: mem0Mode || process.env.MEM0_EXECUTION_MODE || 'api'
    };
    cacheTimestamp = Date.now();
    return settingsCache;
  } catch (e) {
    console.warn('[Config] Error loading settings from DB, falling back to env:', e.message);
    return null;
  }
}

const staticConfig = {
  enabled: process.env.DOOM_AGENT_ENABLED === 'true',
  skillsPath: path.join(__dirname, '../../skills'),
  confidenceThreshold: parseFloat(process.env.DOOM_AGENT_CONFIDENCE_THRESHOLD || '0.5'),
  maxRetries: parseInt(process.env.DOOM_AGENT_MAX_RETRIES || '2', 10),
  memoryWindow: parseInt(process.env.DOOM_AGENT_MEMORY_WINDOW || '5', 10),
  
  // Will be loaded dynamically
  _dbSettings: null,
  
  // Getters that check env first, then DB
  get e2bApiKey() {
    return process.env.E2B_API_KEY || (this._dbSettings?.e2bApiKey);
  },
  
  get e2bExecutionMode() {
    return process.env.E2B_EXECUTION_MODE || this._dbSettings?.e2bExecutionMode || 'api';
  },
  
  get llmApiBase() {
    return process.env.LLM_API_BASE || this._dbSettings?.llmApiBase;
  },
  
  get chromaUrl() {
    return process.env.CHROMA_URL || this._dbSettings?.chromaUrl || 'http://localhost:8000';
  },
  
  get mem0ApiUrl() {
    return process.env.MEM0_API_URL || this._dbSettings?.mem0ApiUrl;
  },
  
  get mem0ApiKey() {
    return process.env.MEM0_API_KEY || this._dbSettings?.mem0ApiKey;
  },
  
  get mem0ExecutionMode() {
    return process.env.MEM0_EXECUTION_MODE || this._dbSettings?.mem0ExecutionMode || 'api';
  }
};

// Initialize DB settings on startup
loadSettingsFromDB().then((settings) => {
  staticConfig._dbSettings = settings;
  console.log('[Config] Loaded settings from database');
}).catch(e => {
  console.warn('[Config] Failed to load DB settings on startup:', e.message);
});

module.exports = staticConfig;
module.exports.loadSettingsFromDB = loadSettingsFromDB;
