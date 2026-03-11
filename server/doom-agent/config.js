const path = require('path');

const config = {
  enabled: process.env.DOOM_AGENT_ENABLED === 'true',
  skillsPath: path.join(__dirname, '../../skills'),
  confidenceThreshold: parseFloat(process.env.DOOM_AGENT_CONFIDENCE_THRESHOLD || '0.5'),
  maxRetries: parseInt(process.env.DOOM_AGENT_MAX_RETRIES || '2', 10),
  memoryWindow: parseInt(process.env.DOOM_AGENT_MEMORY_WINDOW || '5', 10),
  
  e2bApiKey: process.env.E2B_API_KEY,
  
  mem0ApiUrl: process.env.MEM0_API_URL,
  mem0ApiKey: process.env.MEM0_API_KEY,
  mem0UserId: process.env.MEM0_USER_ID || 'default'
};

module.exports = config;
