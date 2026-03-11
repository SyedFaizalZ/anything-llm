class MemoryManager {
  constructor(config) {
    this.config = config;
    this.history = []; // Sliding window of last N turns per session
  }

  async getContext(query, sessionId, userId) {
    const shortTerm = this.history.slice(-this.config.memoryWindow).map(t => 
      `User: ${t.query}\nAssistant: ${t.response}`
    ).join('\n\n');

    let longTerm = "";
    if (this.config.mem0ApiUrl && this.config.mem0ApiKey) {
      try {
        const fetch = require('node-fetch');
        const res = await fetch(`${this.config.mem0ApiUrl}/v1/memories/search/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.config.mem0ApiKey}`
          },
          body: JSON.stringify({ query, user_id: userId || this.config.mem0UserId, limit: 3 })
        });
        if (res.ok) {
          const data = await res.json();
          const memories = data.results || data;
          if (Array.isArray(memories) && memories.length > 0) {
            longTerm = "\n[Persistent Memories]\n" + memories.map(m => `- ${m.memory}`).join('\n');
          }
        }
      } catch (e) {
        console.warn("[doom-agent] Mem0 search failed:", e.message);
      }
    }

    let context = "";
    if (shortTerm) context += `\n[Recent Chat History]\n${shortTerm}\n`;
    if (longTerm) context += longTerm;
    
    return context.trim();
  }

  async saveInteraction(query, response, sessionId, userId) {
    this.history.push({ query, response });
    if (this.history.length > this.config.memoryWindow) {
      this.history.shift();
    }

    if (this.config.mem0ApiUrl && this.config.mem0ApiKey) {
      try {
        const fetch = require('node-fetch');
        await fetch(`${this.config.mem0ApiUrl}/v1/memories/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.config.mem0ApiKey}`
          },
          body: JSON.stringify({
            messages: [
              { role: "user", content: query },
              { role: "assistant", content: response }
            ],
            user_id: userId || this.config.mem0UserId
          })
        });
      } catch (e) {
        // silent fail for persistent memory to prevent crashing
      }
    }
  }
}

module.exports = MemoryManager;
