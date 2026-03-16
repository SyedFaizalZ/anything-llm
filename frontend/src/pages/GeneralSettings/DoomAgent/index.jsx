import React, { useState, useEffect } from "react";
import Sidebar from "@/components/SettingsSidebar";
import System from "@/models/system";
import showToast from "@/utils/toast";

export default function DoomAgentSettings() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({});

  useEffect(() => {
    async function fetchConfig() {
      try {
        console.log("[Doom Agent] Fetching current configuration from backend...");
        const res = await System.getDoomAgentConfig();
        console.log("[Doom Agent] Received config from backend:", res);
        setConfig(res);
      } catch (e) {
        console.error("[Doom Agent] Error fetching config:", e);
        showToast("Failed to fetch Doom Agent config", "error", { clear: true });
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        DOOM_AGENT_ENABLED: config.DOOM_AGENT_ENABLED?.toString(),
        DOOM_AGENT_CONFIDENCE_THRESHOLD: config.DOOM_AGENT_CONFIDENCE_THRESHOLD?.toString(),
        DOOM_AGENT_MAX_RETRIES: config.DOOM_AGENT_MAX_RETRIES?.toString(),
        DOOM_AGENT_MEMORY_WINDOW: config.DOOM_AGENT_MEMORY_WINDOW?.toString(),
        E2B_API_KEY: config.E2B_API_KEY,
        E2B_EXECUTION_MODE: config.E2B_EXECUTION_MODE,
        LLM_API_BASE: config.LLM_API_BASE,
        CHROMA_URL: config.CHROMA_URL,
        MEM0_API_URL: config.MEM0_API_URL,
        MEM0_API_KEY: config.MEM0_API_KEY,
        MEM0_EXECUTION_MODE: config.MEM0_EXECUTION_MODE,
      };
      console.log("[Doom Agent] handleSave - Current config state:", config);
      console.log("[Doom Agent] handleSave - Payload being sent to backend:", payload);
      
      const response = await System.updateDoomAgentConfig(payload);
      console.log("[Doom Agent] handleSave - Response from backend:", response);
      
      if (response.success) {
        showToast("Doom Agent configuration saved", "success", { clear: true });
        // Refresh config from backend to confirm persistence
        const refreshedConfig = await System.getDoomAgentConfig();
        console.log("[Doom Agent] handleSave - Refreshed config after save:", refreshedConfig);
        setConfig(refreshedConfig);
      } else {
        console.error("[Doom Agent] handleSave - Backend returned error:", response.error);
        showToast("Failed to save changes: " + (response.error || "Unknown error"), "error", { clear: true });
      }
    } catch (e) {
      console.error("[Doom Agent] handleSave - Exception:", e);
      showToast("Failed to save changes: " + e.message, "error", { clear: true });
    }
  };

  if (loading) return null;

  return (
    <div className="w-screen h-screen overflow-hidden bg-sidebar flex">
      <Sidebar />
      <div className="flex-1 h-screen overflow-y-scroll bg-theme">
        <div className="px-10 py-10 w-full max-w-4xl">
          <h1 className="text-3xl font-bold text-white mb-6">Universal Agent (Doom) Settings</h1>
          <p className="text-white/60 mb-8">
            Configure the Doom Agent skill-routing, fallback thresholds, and external tool integrations (like E2B execution sandboxes).
          </p>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6 flex flex-col gap-y-4">
              <label className="flex items-center gap-2 text-white">
                <input 
                  type="checkbox" 
                  name="DOOM_AGENT_ENABLED" 
                  checked={config.DOOM_AGENT_ENABLED} 
                  onChange={handleChange} 
                />
                Enable Universal Agent Hooks
              </label>

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">Router Confidence Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="DOOM_AGENT_CONFIDENCE_THRESHOLD"
                  value={config.DOOM_AGENT_CONFIDENCE_THRESHOLD}
                  onChange={handleChange}
                />
                <p className="text-sm text-white/50">Min confidence to trigger a skill (0.0 to 1.0). If skipped, Native RAG runs.</p>
              </div>

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">Tool Retries</label>
                <input
                  type="number"
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="DOOM_AGENT_MAX_RETRIES"
                  value={config.DOOM_AGENT_MAX_RETRIES}
                  onChange={handleChange}
                />
              </div>

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">Memory Window</label>
                <input
                  type="number"
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="DOOM_AGENT_MEMORY_WINDOW"
                  value={config.DOOM_AGENT_MEMORY_WINDOW}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">External APIs & Sandboxes</h2>
             <div className="bg-white/5 rounded-lg p-6 flex flex-col gap-y-4">
               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">E2B Sandbox Execution Mode</label>
                <select
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="E2B_EXECUTION_MODE"
                  value={config.E2B_EXECUTION_MODE || "api"}
                  onChange={handleChange}
                >
                  <option value="api">E2B Cloud API (Recommended)</option>
                  <option value="local">Local Execution</option>
                </select>
                <p className="text-sm text-white/50">Choose cloud sandboxing or local code execution.</p>
              </div>

               {(config.E2B_EXECUTION_MODE === "api" || config.E2B_EXECUTION_MODE === undefined) && (
                <div className="flex flex-col gap-y-1">
                  <label className="text-white font-medium">E2B Sandbox API Key</label>
                  <input
                    type="password"
                    className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                    name="E2B_API_KEY"
                    value={config.E2B_API_KEY || ""}
                    onChange={handleChange}
                    placeholder="e2b_..."
                  />
                  <p className="text-sm text-white/50">Get your API key from <a href="https://e2b.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">e2b.dev</a></p>
                </div>
              )}

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">LLM API Base URL (Optional)</label>
                <input
                  type="text"
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="LLM_API_BASE"
                  value={config.LLM_API_BASE || ""}
                  onChange={handleChange}
                  placeholder="http://localhost:8000/v1"
                />
                <p className="text-sm text-white/50">Local LLM endpoint (e.g., Ollama, Vllm, or LM Studio). Leave empty to use cloud API.</p>
              </div>

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">ChromaDB URL</label>
                <input
                  type="text"
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="CHROMA_URL"
                  value={config.CHROMA_URL || "http://localhost:8000"}
                  onChange={handleChange}
                  placeholder="http://localhost:8000"
                />
                <p className="text-sm text-white/50">Vector database endpoint for RAG.</p>
              </div>

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">Mem0 Execution Mode</label>
                <select
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="MEM0_EXECUTION_MODE"
                  value={config.MEM0_EXECUTION_MODE || "api"}
                  onChange={handleChange}
                >
                  <option value="api">Mem0 Cloud API</option>
                  <option value="local">Local Mem0 Instance</option>
                </select>
                <p className="text-sm text-white/50">Choose between cloud memory service or local deployment.</p>
              </div>

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">Mem0 API Key</label>
                <input
                  type="password"
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="MEM0_API_KEY"
                  value={config.MEM0_API_KEY || ""}
                  onChange={handleChange}
                  placeholder="mem0_..."
                />
                <p className="text-sm text-white/50">Required for cloud API mode.</p>
              </div>

               <div className="flex flex-col gap-y-1">
                <label className="text-white font-medium">Mem0 API URL</label>
                <input
                  type="text"
                  className="bg-zinc-900 border border-zinc-500 text-white rounded-md px-4 py-2"
                  name="MEM0_API_URL"
                  value={config.MEM0_API_URL || ""}
                  onChange={handleChange}
                  placeholder="https://api.mem0.ai"
                />
                <p className="text-sm text-white/50">Cloud: https://api.mem0.ai | Local: http://localhost:8000</p>
              </div>
            </div>

            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all">
              Save Configuration
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
