import React from "react";

export default function ConditionalNode({
  config,
  onConfigChange
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-theme-text-primary mb-2">Value 1</label>
          <input
            type="text"
            value={config?.value1 || ""}
            onChange={(e) => onConfigChange({ ...config, value1: e.target.value })}
            className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg outline-none p-2.5 focus:outline-primary-button active:outline-primary-button"
            placeholder="${var1}"
          />
        </div>
        <div className="w-1/4">
          <label className="block text-sm font-medium text-theme-text-primary mb-2">Operator</label>
          <select
            value={config?.operator || "=="}
            onChange={(e) => onConfigChange({ ...config, operator: e.target.value })}
            className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg outline-none p-2.5 focus:outline-primary-button active:outline-primary-button"
          >
            <option value="==">{"=="}</option>
            <option value="===">{"==="}</option>
            <option value="!=">{"!="}</option>
            <option value=">">{">"}</option>
            <option value="<">{"<"}</option>
            <option value=">=">{">="}</option>
            <option value="<=">{"<="}</option>
            <option value="contains">{"contains"}</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-theme-text-primary mb-2">Value 2</label>
          <input
            type="text"
            value={config?.value2 || ""}
            onChange={(e) => onConfigChange({ ...config, value2: e.target.value })}
            className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg outline-none p-2.5 focus:outline-primary-button active:outline-primary-button"
            placeholder="value to compare"
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-theme-text-primary mb-2">If True</label>
          <select
            value={config?.actionIfTrue || "continue"}
            onChange={(e) => onConfigChange({ ...config, actionIfTrue: e.target.value })}
            className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg outline-none p-2.5 focus:outline-primary-button active:outline-primary-button"
          >
            <option value="continue">Continue Flow</option>
            <option value="halt">Halt Flow</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-theme-text-primary mb-2">If False</label>
          <select
            value={config?.actionIfFalse || "halt"}
            onChange={(e) => onConfigChange({ ...config, actionIfFalse: e.target.value })}
            className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg outline-none p-2.5 focus:outline-primary-button active:outline-primary-button"
          >
            <option value="continue">Continue Flow</option>
            <option value="halt">Halt Flow</option>
          </select>
        </div>
      </div>
    </div>
  );
}
