import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import "./save.css";
export function useDraft(saved) {
  const signature = JSON.stringify(saved);
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [signature]);
  return {
    draft,
    setDraft,
    dirty: JSON.stringify(draft) !== signature,
    reset: () => setDraft(saved),
  };
}
export default function SaveActions({
  dirty,
  onSave,
  onCancel,
  label = "Save changes",
  saveLabel = label,
  compact = false,
}) {
  return (
    <div className={`save-actions ${compact ? "compact" : ""}`}>
      <span role="status">
        {dirty ? "Unsaved changes" : "Saved on this device"}
      </span>
      <div>
        {dirty && (
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="button"
          aria-label={saveLabel}
          disabled={!dirty}
          onClick={onSave}
        >
          <Check size={15} />
          {label}
        </button>
      </div>
    </div>
  );
}
