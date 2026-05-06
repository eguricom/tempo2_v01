import { Briefcase, Coffee } from "lucide-react";
import type { ShiftSegment } from "@/lib/store";

export function SegmentChips({
  segments,
  size = "sm",
  withDuration = false,
}: {
  segments?: ShiftSegment[];
  size?: "xs" | "sm";
  withDuration?: boolean;
}) {
  if (!segments || segments.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const ordered = [...segments].sort((a, b) => a.start.localeCompare(b.start));
  const cls = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";
  const dur = (s: ShiftSegment) => {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    const m = Math.max(0, eh * 60 + em - sh * 60 - sm);
    return `${Math.floor(m / 60)}h${m % 60 ? `${m % 60}m` : ""}`;
  };
  return (
    <div className="flex flex-wrap gap-1">
      {ordered.map((s) => (
        <span
          key={s.id}
          className={`inline-flex items-center gap-1 rounded-md border font-medium tabular-nums ${cls} ${
            s.type === "work"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-warning/15 text-warning-foreground border-warning/30"
          }`}
          title={s.type === "work" ? "Trabajo" : "Descanso"}
        >
          {s.type === "work" ? <Briefcase className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
          {s.start}–{s.end}
          {withDuration && <span className="opacity-60">({dur(s)})</span>}
        </span>
      ))}
    </div>
  );
}
