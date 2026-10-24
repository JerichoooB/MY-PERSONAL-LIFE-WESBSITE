import React, { useState, useMemo, useRef } from "react";
import { Upload, Download, CalendarDays, Check, BookOpen } from "lucide-react";
import template from "./templates/second-year-schedule.json";
import { validateSchedule, previewSchedule, dayNames } from "./schedule.js";
import "./schedule.css";
const time = (value) =>
  new Date(`2000-01-01T${value}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
export default function ScheduleImport({ existing, onImport, onClose }) {
  const [schedule, setSchedule] = useState(template);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [choices, setChoices] = useState({});
  const [excluded, setExcluded] = useState("");
  const [error, setError] = useState("");
  const [ack, setAck] = useState(false);
  const file = useRef();
  const preview = useMemo(() => {
    try {
      return {
        ...previewSchedule(
          schedule,
          {
            start,
            end,
            choices,
            exclude: excluded.split(/[\s,]+/).filter(Boolean),
          },
          existing,
        ),
        error: "",
      };
    } catch (e) {
      return {
        events: [],
        classes: [],
        skipped: 0,
        conflicts: [],
        error: e.message,
      };
    }
  }, [schedule, start, end, choices, excluded, existing]);
  const load = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 500000)
        throw Error("Choose a schedule smaller than 500 KB.");
      const parsed = validateSchedule(JSON.parse(await f.text()));
      setSchedule(parsed);
      setChoices({});
      setError("");
      setAck(false);
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(schedule, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${schedule.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="schedule-import">
      <div className="schedule-source">
        <span>
          <BookOpen size={23} />
        </span>
        <div>
          <strong>{schedule.title}</strong>
          <p>Weekly classes · Philippine local time (UTC+8)</p>
        </div>
      </div>
      <p className="schedule-intro">
        Add your weekly classes for the dates you choose. Your existing events,
        tasks, diary, and other data stay in place.
      </p>
      <div className="schedule-file-actions">
        <button
          className="button secondary"
          onClick={() => file.current.click()}
        >
          <Upload size={15} />
          Choose schedule JSON
        </button>
        <button className="text-link" onClick={download}>
          <Download size={14} />
          Download template
        </button>
        <input
          hidden
          ref={file}
          type="file"
          accept=".json,application/json"
          onChange={load}
        />
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-grid">
        <label>
          First class date
          <input
            aria-label="First class date"
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setAck(false);
            }}
          />
        </label>
        <label>
          Last class date
          <input
            aria-label="Last class date"
            type="date"
            min={start || undefined}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setAck(false);
            }}
          />
        </label>
      </div>
      {schedule.groups.map((g) => (
        <label key={g.id}>
          {g.label}
          <select
            aria-label={g.label}
            value={choices[g.id] || ""}
            onChange={(e) => {
              setChoices((c) => ({ ...c, [g.id]: e.target.value }));
              setAck(false);
            }}
          >
            <option value="">Choose your option…</option>
            {g.options.map((o) => (
              <option value={o.id} key={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label>
        Skip dates (optional)
        <input
          aria-label="Skip dates"
          value={excluded}
          placeholder="2026-12-25, 2027-01-01"
          onChange={(e) => {
            setExcluded(e.target.value);
            setAck(false);
          }}
        />
        <small>
          Enter holidays or cancelled class dates, separated by commas.
        </small>
      </label>
      <div className="schedule-timing-note">
        I read 1:00–5:30 classes as afternoon, 8:00–10:00 as morning, and
        Discrete Mathematics as 10:00 AM–1:00 PM. Check these times below. The
        image lists both section and PE options; choose only the one you attend.
        Holidays are included unless skipped. Use Philippines time on your
        device.
      </div>
      <div className="schedule-preview">
        <h3>
          <CalendarDays size={18} />
          Import preview
        </h3>
        {preview.error ? (
          <p className="muted">{preview.error}</p>
        ) : (
          <>
            <div className="schedule-preview-count">
              <strong>{preview.events.length}</strong>
              <span>
                class events to add
                {preview.skipped > 0 &&
                  ` · ${preview.skipped} already imported, skipped`}
              </span>
            </div>
            <div className="schedule-class-list">
              {preview.classes.map((c) => (
                <div key={c.id}>
                  <i style={{ background: c.color }} />
                  <div>
                    <strong>
                      {c.code} · {c.title}
                    </strong>
                    <small>
                      {c.days.map((d) => dayNames[d]).join(", ")} ·{" "}
                      {time(c.start)}–{time(c.end)} · Room {c.room}
                    </small>
                    <small>
                      {c.instructor} · {c.attendanceNote}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            {preview.events.length > 0 && (
              <p className="muted">
                First event: {preview.events[0].start.replace("T", " at ")}
                <br />
                Last event: {preview.events.at(-1).start.replace("T", " at ")}
              </p>
            )}
            {preview.conflicts.length > 0 && (
              <div className="schedule-conflicts">
                <p>
                  {preview.conflicts.length} new class{" "}
                  {preview.conflicts.length === 1
                    ? "overlaps"
                    : "events overlap"}{" "}
                  another event.
                </p>
                {preview.conflicts.slice(0, 3).map((c, i) => (
                  <small key={i}>
                    {c.start.replace("T", " ")} · {c.title} overlaps {c.other}
                  </small>
                ))}
                <label>
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  Import despite these overlaps
                </label>
              </div>
            )}
          </>
        )}
      </div>
      <div className="form-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button"
          disabled={
            !!error ||
            !!preview.error ||
            !preview.events.length ||
            (!!preview.conflicts.length && !ack)
          }
          onClick={() => onImport(preview.events, start)}
        >
          <Check size={16} />
          Import {preview.events.length || ""} class events
        </button>
      </div>
    </div>
  );
}
