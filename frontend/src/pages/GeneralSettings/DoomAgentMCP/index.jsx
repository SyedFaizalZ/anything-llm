import React, { useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { MCPServerHeader, MCPServersList } from "@/pages/Admin/Agents/MCPServers";
import ServerPanel from "@/pages/Admin/Agents/MCPServers/ServerPanel";

export default function DoomAgentMCP() {
  const [selectedMcpServer, setSelectedMcpServer] = useState(null);
  const [mcpServers, setMcpServers] = useState([]);

  const toggleMCP = (serverName) => {
    setMcpServers((prev) => {
      return prev.map((server) => {
        if (server.name !== serverName) return server;
        return { ...server, running: !server.running };
      });
    });
  };

  const handleMCPServerDelete = (serverName) => {
    setSelectedMcpServer(null);
    setMcpServers((prev) =>
      prev.filter((server) => server.name !== serverName)
    );
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />

      {/* List Sidebar */}
      <div className="w-1/4 h-full bg-theme-bg-secondary border-r border-theme-modal-border flex flex-col pt-12 pb-6 px-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-theme-text-primary font-bold text-lg">Doom MCP Configs</h2>
        </div>

        <MCPServerHeader
          setMcpServers={setMcpServers}
          setSelectedMcpServer={setSelectedMcpServer}
        >
          {({ loadingMcpServers }) => (
            <div className="mt-4 flex flex-col gap-y-4">
              <MCPServersList
                isLoading={loadingMcpServers}
                servers={mcpServers}
                selectedServer={selectedMcpServer}
                handleClick={(server) => setSelectedMcpServer(server)}
              />
            </div>
          )}
        </MCPServerHeader>
      </div>

      {/* Editor Panel */}
      <div className="w-3/4 h-full bg-theme-bg-secondary flex flex-col p-6 overflow-y-auto">
        {selectedMcpServer === null ? (
          <div className="flex-1 flex items-center justify-center text-theme-text-secondary">
            <p>Select an MCP Server to view its tools.</p>
          </div>
        ) : (
          <div className="bg-theme-bg-primary text-theme-text-primary border border-theme-modal-border rounded-xl p-6">
            <ServerPanel
              server={selectedMcpServer}
              toggleServer={toggleMCP}
              onDelete={handleMCPServerDelete}
            />

            <div className="mt-8 border-t border-theme-modal-border pt-6">
              <h3 className="text-theme-text-primary font-medium text-lg mb-4">How Doom Agent sees these tools:</h3>
              {selectedMcpServer?.tools?.length === 0 ? (
                <p className="text-theme-text-secondary text-sm">No tools discovered.</p>
              ) : (
                <div className="flex flex-col gap-y-4">
                  {selectedMcpServer.tools.map((tool) => (
                    <div key={tool.name} className="flex flex-col gap-y-1 bg-theme-bg-secondary border border-theme-modal-border p-4 rounded-lg">
                      <div className="text-blue-400 font-medium whitespace-break-spaces">
                        @@mcp_{selectedMcpServer.name}_{tool.name}
                      </div>
                      <p className="text-theme-text-secondary text-sm mt-1">{tool.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
