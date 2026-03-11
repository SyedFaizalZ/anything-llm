import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

export default {
  // Existing system calls
  // ... (leaving other methods untouched via multi-replace) ...
  
  // Doom Agent
  getDoomAgentConfig: async () => {
    return fetch(`${API_BASE}/doom-agent/config`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return {};
      });
  },
  updateDoomAgentConfig: async (body) => {
    return fetch(`${API_BASE}/doom-agent/config`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  getDoomAgentSkills: async () => {
    return fetch(`${API_BASE}/doom-agent/skills`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { skills: [] };
      });
  },
  getDoomAgentSkill: async (name) => {
    return fetch(`${API_BASE}/doom-agent/skills/${name}`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { content: null };
      });
  },
  saveDoomAgentSkill: async (name, content) => {
    return fetch(`${API_BASE}/doom-agent/skills/${name}`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ content }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false };
      });
  },
  deleteDoomAgentSkill: async (name) => {
    return fetch(`${API_BASE}/doom-agent/skills/${name}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false };
      });
  },
};
