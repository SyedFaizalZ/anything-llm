import React, { createContext, useState, useContext, useRef } from 'react';
import { API_BASE } from "@/utils/constants";

const CanvasContext = createContext({});

export function CanvasProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const editHistoryRef = useRef([]);

  const openCanvas = (initialCode, initialLang) => {
    editHistoryRef.current = [];
    setCode(initialCode);
    setLanguage(initialLang);
    setOutput(null);
    setIsOpen(true);
    runCode(initialCode, initialLang);
  };

  const closeCanvas = () => setIsOpen(false);

  const patchCode = (newCode) => {
    editHistoryRef.current.push(code);
    setCode(newCode);
  };

  const canUndo = editHistoryRef.current.length > 0;

  const undoEdit = () => {
    if (editHistoryRef.current.length === 0) return;
    const prev = editHistoryRef.current.pop();
    setCode(prev);
  };

  const runCode = async (codeToRun, langToRun) => {
    setIsLoading(true);
    // Save current code to history before running if it differs
    if (code && codeToRun !== code && editHistoryRef.current[editHistoryRef.current.length - 1] !== code) {
      editHistoryRef.current.push(code);
    }
    setCode(codeToRun);
    try {
      const res = await fetch(`${API_BASE}/canvas/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${window.localStorage.getItem("anythingllm_authToken")}`
        },
        body: JSON.stringify({ code: codeToRun, language: langToRun || language })
      });

      // Handle non-OK responses before trying to parse JSON
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Server error (${res.status})`;
        try {
          const parsed = JSON.parse(text);
          errorMsg = parsed.error || errorMsg;
        } catch {
          errorMsg = text || errorMsg;
        }
        setOutput({ stderr: errorMsg });
        return;
      }

      const text = await res.text();
      if (!text) {
        setOutput({ stderr: "Empty response from server. Check that E2B is configured in Agent Settings." });
        return;
      }

      const data = JSON.parse(text);
      if (data.success) {
        setOutput(data);
      } else {
        setOutput({ stderr: data.error || "Failed to execute." });
      }
    } catch (e) {
      setOutput({ stderr: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CanvasContext.Provider value={{
      isOpen, code, language, output, isLoading,
      openCanvas, closeCanvas, runCode, setCode,
      patchCode, canUndo, undoEdit, editHistory: editHistoryRef.current
    }}>
      {children}
    </CanvasContext.Provider>
  );
}

export const useCanvas = () => useContext(CanvasContext);
