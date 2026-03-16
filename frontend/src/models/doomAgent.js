import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

export default {
  // Existing system calls
  // ... (leaving other methods untouched via multi-replace) ...
  
  // Doom Agent
  getDoomAgentConfig: async () => {
    console.log("[Doom Agent Model] getDoomAgentConfig called");
    return fetch(`${API_BASE}/doom-agent/config`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => {
        console.log("[Doom Agent Model] GET /config response status:", res.status);
        return res.json().then(data => {
          console.log("[Doom Agent Model] GET /config response data:", data);
          return data;
        });
      })
      .catch((e) => {
        console.error("[Doom Agent Model] getDoomAgentConfig error:", e);
        return {};
      });
  },
  updateDoomAgentConfig: async (body) => {
    console.log("[Doom Agent Model] updateDoomAgentConfig called with:", body);
    return fetch(`${API_BASE}/doom-agent/config`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(body),
    })
      .then((res) => {
        console.log("[Doom Agent Model] Response status:", res.status);
        return res.json().then(data => {
          console.log("[Doom Agent Model] Response JSON:", data);
          return data;
        });
      })
      .catch((e) => {
        console.error("[Doom Agent Model] updateDoomAgentConfig error:", e);
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
