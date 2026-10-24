import React, { useState, useEffect } from "react";
import { to12Hour, from12Hour } from "./time.js";
import "./time.css";
export function TimeInput({
  value,
  onChange,
  label,
  required = false,
  clearable = false,
}) {
  const [parts, setParts] = useState(() => to12Hour(value));
  useEffect(() => setParts(to12Hour(value)), [value]);
  const change = (key, v) => {
    const next = { ...parts, [key]: v };
    setParts(next);
    onChange(from12Hour(next));
  };
  return (
    <div className="time-input" role="group" aria-label={label}>
      <select
        aria-label={`${label} hour`}
        value={parts.hour}
        required={required}
        onChange={(e) => change("hour", e.target.value)}
      >
        <option value="">Hour</option>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        aria-label={`${label} minute`}
        value={parts.minute}
        onChange={(e) => change("minute", e.target.value)}
      >
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map(
          (m) => (
            <option key={m}>{m}</option>
          ),
        )}
      </select>
      <select
        aria-label={`${label} AM or PM`}
        value={parts.period}
        onChange={(e) => change("period", e.target.value)}
      >
        <option>AM</option>
        <option>PM</option>
      </select>
      {clearable && value && (
        <button
          type="button"
          className="time-clear"
          aria-label={`Clear ${label}`}
          onClick={() => onChange("")}
        >
          Clear
        </button>
      )}
    </div>
  );
}
export function DateTimeInput({ value, onChange, label, required = false }) {
  const [date, setDate] = useState(() => value?.slice(0, 10) || "");
  const [clock, setClock] = useState(() => value?.slice(11, 16) || "");
  useEffect(() => {
    if (value) {
      setDate(value.slice(0, 10));
      setClock(value.slice(11, 16));
    }
  }, [value]);
  return (
    <div className="datetime-input">
      <input
        type="date"
        aria-label={`${label} date`}
        required={required}
        value={date}
        onChange={(e) => {
          const next = e.target.value;
          setDate(next);
          onChange(next && clock ? `${next}T${clock}` : "");
        }}
      />
      <TimeInput
        label={label}
        value={clock}
        required={required}
        onChange={(next) => {
          setClock(next);
          onChange(date && next ? `${date}T${next}` : "");
        }}
      />
    </div>
  );
}
