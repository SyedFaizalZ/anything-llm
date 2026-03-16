import React, { useState, useEffect } from "react";
import Sidebar from "@/components/SettingsSidebar";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { Trash } from "@phosphor-icons/react";

export default function DoomAgentSkills() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState({});
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillContent, setSkillContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await System.getDoomAgentSkills();
      setSkills(res.skills || []);
    } catch (e) {
      showToast("Failed to fetch skills", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleSelectSkill = async (folderName) => {
    try {
      const res = await System.getDoomAgentSkill(folderName);
      setSelectedSkill(folderName);
      setSkillContent(res.content || "");
      setIsEditing(false);
      setNewSkillName("");
    } catch (e) {
      showToast("Failed to fetch skill content", "error");
    }
  };

  const handleCreateNew = () => {
    setSelectedSkill("");
    setSkillContent(`---
name: new-skill
description: A short description of what this skill does.
triggers: ["do something", "help me with x"]
negative_triggers: []
allowed_tools: ["web_search", "python_exec"]
---

# Instructions
You are a specialized agent...
`);
    setIsEditing(true);
    setNewSkillName("my-new-skill");
  };

  const handleSave = async () => {
    const targetName = selectedSkill || newSkillName;
    if (!targetName) return showToast("Skill name required", "error");
    
    try {
      await System.saveDoomAgentSkill(targetName, skillContent);
      showToast("Skill saved successfully!", "success");
      await fetchSkills();
      if (!selectedSkill) {
        handleSelectSkill(targetName);
      }
    } catch (e) {
      showToast("Failed to save skill", "error");
    }
  };

  const handleDelete = async (folderName) => {
    if (!window.confirm(`Are you sure you want to delete the skill '${folderName}'?`)) return;
    
    try {
      await System.deleteDoomAgentSkill(folderName);
      showToast("Skill deleted", "success");
      if (selectedSkill === folderName) {
        setSelectedSkill(null);
        setSkillContent("");
      }
      await fetchSkills();
    } catch (e) {
      showToast("Failed to delete skill", "error");
    }
  };

  const flatSkillsList = Array.isArray(skills) ? skills : [];

  return (
    <div className="w-screen h-screen overflow-hidden bg-sidebar flex">
      <Sidebar />
      
      {/* List Sidebar */}
      <div className="w-1/4 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">Agent Skills</h2>
          <button 
            onClick={handleCreateNew} 
            className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            + New
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-white/50 text-center mt-4">Loading...</p>
          ) : flatSkillsList.length === 0 ? (
            <p className="text-white/50 text-center mt-4 text-sm">No skills found.</p>
          ) : (
             flatSkillsList.map(s => (
               <div 
                 key={s.name} 
                 className={`flex justify-between items-center p-3 mb-1 rounded cursor-pointer ${selectedSkill === s.name ? "bg-white/10" : "hover:bg-white/5"} transition-colors`}
                 onClick={() => handleSelectSkill(s.name)}
               >
                 <div>
                   <p className="text-white font-medium text-sm">{s.name}</p>
                   <p className="text-white/40 text-xs">{s.category}</p>
                 </div>
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleDelete(s.name); }}
                   className="text-red-400 hover:text-red-300 transition-colors flex items-center justify-center w-6 h-6 rounded hover:bg-red-400/10"
                 >
                   <Trash className="w-4 h-4" />
                 </button>
               </div>
             ))
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="w-3/4 h-full bg-theme flex flex-col">
         {selectedSkill === null && !isEditing ? (
           <div className="flex-1 flex items-center justify-center text-white/40">
             <p>Select a skill to view or edit, or create a new one.</p>
           </div>
         ) : (
           <div className="flex-1 flex flex-col p-6">
             <div className="flex justify-between items-center mb-6">
                {selectedSkill ? (
                  <h1 className="text-2xl font-bold text-white max-w-[50%] truncate">{selectedSkill}/SKILL.md</h1>
                ) : (
                  <div className="flex items-center gap-4 w-1/2">
                    <label className="text-white">Folder Name:</label>
                    <input 
                      type="text" 
                      className="bg-zinc-900 border border-zinc-500 text-white rounded px-3 py-1 flex-1"
                      placeholder="my-cool-skill"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                   {!isEditing && selectedSkill && (
                     <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20">Edit</button>
                   )}
                   {(isEditing || !selectedSkill) && (
                     <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
                   )}
                </div>
             </div>

             <div className="flex-1 border border-zinc-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
               {isEditing || !selectedSkill ? (
                 <textarea 
                   className="w-full h-full p-4 bg-transparent text-[#d4d4d4] font-mono text-sm resize-none focus:outline-none"
                   value={skillContent}
                   onChange={(e) => setSkillContent(e.target.value)}
                 />
               ) : (
                 <pre className="w-full h-full p-4 overflow-y-auto text-[#d4d4d4] font-mono text-sm whitespace-pre-wrap">
                   {skillContent}
                 </pre>
               )}
             </div>
           </div>
         )}
      </div>

    </div>
  );
}
