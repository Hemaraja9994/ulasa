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
              background: active ? "var(--chrome-2)" : "var(--surface)",
              color: active ? "#FFFFFF" : "var(--text-muted)",
              borderColor: active ? "var(--chrome-2)" : "var(--border)",
            }}
          >
            {opt.dotColor && (
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
                style={{ background: opt.dotColor }}
              />
            )}
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className="rounded-full px-1.5 py-0.2 text-[10px] font-semibold"
                style={{
                  background: active ? "rgba(255,255,255,0.18)" : "var(--surface-2)",
                  color: active ? "#FFFFFF" : "var(--text-muted)",
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
