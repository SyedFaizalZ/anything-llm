import React from "react";

export default function DataTransformNode({
  config,
  onConfigChange,
  renderVariableSelect,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          Input Data (Variable or JSON)
        </label>
        <input
          type="text"
          value={config?.data || ""}
          onChange={(e) => onConfigChange({ ...config, data: e.target.value })}
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg outline-none p-2.5 focus:outline-primary-button active:outline-primary-button"
          placeholder="${myVariable} or valid JSON"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          JavaScript Transformation Code (Receives 'data' as input)
        </label>
        <textarea
          value={config?.transformCode || ""}
          onChange={(e) => onConfigChange({ ...config, transformCode: e.target.value })}
          className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg outline-none p-2.5 font-mono focus:outline-primary-button active:outline-primary-button"
          rows={5}
          placeholder="return Object.keys(data);"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text-primary mb-2">
          Result Variable
        </label>
        {renderVariableSelect(
          config.resultVariable,
          (value) => onConfigChange({ ...config, resultVariable: value }),
          "Select variable"
        )}
      </div>
    </div>
  );
}
