import { useEffect, useRef, useState } from "react";
import { Briefcase, Coffee } from "lucide-react";
import type { ShiftSegment } from "@/lib/store";

function dur(s: ShiftSegment) {
  const [sh, sm] = s.start.split(":").map(Number);
  const [eh, em] = s.end.split(":").map(Number);
  const m = Math.max(0, eh * 60 + em - sh * 60 - sm);
  return `${Math.floor(m / 60)}h${m % 60 ? `${m % 60}m` : ""}`;
}

function isValidHHMM(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function EditableTime({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  if (!editing) {
    return (
      <span
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setEditing(true);
        }}
        className={disabled ? "" : "cursor-text rounded px-0.5 hover:bg-background/60"}
      >
        {value}
      </span>
    );
  }
  const commit = () => {
    setEditing(false);
    if (v !== value && isValidHHMM(v)) onChange(v);
    else setV(value);
  };
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      className="w-12 rounded border bg-background px-0.5 text-center text-inherit outline-none focus:ring-1 focus:ring-primary"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        else if (e.key === "Escape") {
          setV(value);
          setEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function SegmentChips({
  segments,
  size = "sm",
  withDuration = false,
  onSegmentChange,
  avatarColor,
  onSegmentClick,
}: {
  segments?: ShiftSegment[];
  size?: "xs" | "sm";
  withDuration?: boolean;
  onSegmentChange?: (id: string, patch: Partial<ShiftSegment>) => void;
  avatarColor?: string;
  onSegmentClick?: (id: string) => void;
}) {
  if (!segments || segments.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const ordered = [...segments].sort((a, b) => a.start.localeCompare(b.start));
  const cls = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";
  return (
    <div
      className="flex flex-wrap gap-1"
      style={avatarColor ? { borderLeft: '3px solid ' + avatarColor, paddingLeft: '6px' } : undefined}
  >
      {ordered.map((s) => {
        const editable = !!onSegmentChange;
        return (
          <span
            key={s.id}
            onClick={() => onSegmentClick?.(s.id)}
            className={`inline-flex items-center gap-1 rounded-md border font-medium tabular-nums ${cls} ${
              s.type === "work"
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-warning/15 text-warning-foreground border-warning/30"
            } ${onSegmentClick ? "cursor-pointer" : ""}`}
            title={s.type === "work" ? "Trabajo" : "Descanso"}
          >
            {s.type === "work" ? <Briefcase className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
            {editable ? (
              <>
                <EditableTime value={s.start} onChange={(v) => onSegmentChange!(s.id, { start: v })} />
                –
                <EditableTime value={s.end} onChange={(v) => onSegmentChange!(s.id, { end: v })} />
              </>
            ) : (
              <>{s.start}–{s.end}</>
            )}
            {withDuration && <span className="opacity-60">({dur(s)})</span>}
          </span>
        );
      })}
    </div>
  );
}
