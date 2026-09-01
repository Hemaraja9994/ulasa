"use client";

export interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
  /** Dot colour (CSS colour value) shown before the label, e.g. a language rail. */
  dotColor?: string;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  activeId: string;
  onChange: (id: string) => void;
}

export function FilterChips({ options, activeId, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Sample filters">
      {options.map((opt) => {
        const active = activeId === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border"
            style={{
              background: active ? "var(--text)" : "var(--surface)",
              color: active ? "var(--surface)" : "var(--text-muted)",
              borderColor: active ? "var(--text)" : "var(--border)",
            }}
          >
            {opt.dotColor && (
              <span
                className="h-1.5 w-1.5 rounded-sm shrink-0"
                style={{ background: active ? "var(--surface)" : opt.dotColor }}
              />
            )}
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className="rounded-full px-1.5 py-0.2 text-[10px] font-semibold"
                style={{
                  background: active ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
                  color: active ? "var(--surface)" : "var(--text-muted)",
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
