import React, { useState } from "react";
import { useCanvas } from "./CanvasContext";
import { X, PlayCircle, DownloadSimple, Copy, ArrowCounterClockwise, Check } from "@phosphor-icons/react";

export default function CanvasPanel() {
  const {
    isOpen, closeCanvas, code, setCode, language,
    output, isLoading, runCode, canUndo, undoEdit, editHistory
  } = useCanvas();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRun = () => runCode(code, language);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (output?.base64Image) {
      const link = document.createElement("a");
      link.download = "canvas-output.png";
      link.href = `data:image/png;base64,${output.base64Image}`;
      link.click();
    } else if (output?.svg) {
      const blob = new Blob([output.svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "canvas-output.svg";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } else if (output?.html) {
      const blob = new Blob([output.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "canvas-output.html";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const hasOutput = output?.base64Image || output?.svg || output?.html;

  return (
    <div className="w-[800px] max-w-[50vw] h-full flex flex-col bg-theme-bg-secondary border-l border-theme-modal-border shadow-lg transition-transform duration-300 relative z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-theme-modal-border">
        <h2 className="text-white text-lg font-semibold flex items-center gap-x-2">
          Canvas <span className="text-xs bg-theme-sidebar-border px-2 py-1 rounded text-gray-300">{language}</span>
          {editHistory.length > 0 && (
            <span className="text-xs text-gray-500">({editHistory.length} edit{editHistory.length !== 1 ? 's' : ''})</span>
          )}
        </h2>
        <div className="flex gap-x-1 text-white">
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="p-2 hover:bg-theme-bg-chat rounded transition-colors"
            title="Run Code"
          >
            <PlayCircle size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          {editHistory.length > 0 && (
            <button
              onClick={undoEdit}
              className="p-2 hover:bg-theme-bg-chat rounded transition-colors"
              title="Undo last edit"
            >
              <ArrowCounterClockwise size={20} />
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!hasOutput}
            className={`p-2 hover:bg-theme-bg-chat rounded transition-colors ${!hasOutput ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Download Output"
          >
            <DownloadSimple size={20} />
          </button>
          <button
            onClick={handleCopyCode}
            className="p-2 hover:bg-theme-bg-chat rounded transition-colors"
            title="Copy Code"
          >
            {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
          </button>
          <button onClick={closeCanvas} className="p-2 hover:bg-theme-bg-chat rounded transition-colors" title="Close Canvas">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-white/5 relative p-4 border-b border-theme-modal-border text-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
               <div className="text-center text-slate-400">
                 <div className="h-8 w-8 border-4 border-slate-500 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                 Running in E2B sandbox...
               </div>
            </div>
          ) : output ? (
            <div className="flex flex-col h-full gap-y-2">
              {output.base64Image && (
                <div className="flex-1 flex items-center justify-center bg-white rounded p-2 overflow-auto">
                   <img src={`data:image/png;base64,${output.base64Image}`} alt="Canvas Output" className="max-w-full max-h-full" />
                </div>
              )}
              {output.svg && !output.base64Image && (
                <div className="flex-1 flex items-center justify-center bg-white rounded p-2 overflow-auto" dangerouslySetInnerHTML={{ __html: output.svg }} />
              )}
              {output.html && !output.svg && !output.base64Image && (
                <div className="flex-1 rounded overflow-hidden">
                  <iframe
                    title="Canvas Render"
                    srcDoc={output.html}
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full border-none bg-white"
                  />
                </div>
              )}

              {(output.stdout || output.stderr) && (
                <div className="bg-[#1e1e1e] p-2 rounded text-green-400 font-mono text-sm overflow-auto max-h-[30%]">
                  <pre className="whitespace-pre-wrap">{output.stdout}{output.stderr && <span className="text-red-400">{output.stderr}</span>}</pre>
                </div>
              )}
            </div>
          ) : (
             <div className="flex items-center justify-center h-full text-slate-400">No output yet. Click ▶ to run.</div>
          )}
        </div>

        {/* Code Editor Area */}
        <div className="h-[40%] flex flex-col border-t border-theme-sidebar-border bg-[#1e1e1e]">
          <div className="text-xs text-slate-400 p-2 border-b border-theme-sidebar-border flex items-center justify-between">
            <span>Code Editor — edit and re-run</span>
            <span className="text-slate-600">{code.split('\n').length} lines</span>
          </div>
          <textarea
             className="flex-1 w-full bg-transparent text-slate-200 p-4 font-mono text-sm resize-none focus:outline-none"
             value={code}
             onChange={(e) => setCode(e.target.value)}
             spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
