"use client";

export interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
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
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              active
                ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                : "border border-slate-200 bg-surface text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
            style={{
              background: active ? "var(--accent)" : undefined,
              color: active ? "#ffffff" : undefined,
            }}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
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
