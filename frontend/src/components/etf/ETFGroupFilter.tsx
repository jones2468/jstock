const groups = [
  { value: undefined, label: "全部" },
  { value: "tw", label: "台股組" },
  { value: "overseas", label: "海外組" },
] as const;

interface Props {
  selected: string | undefined;
  onChange: (group: string | undefined) => void;
}

export function ETFGroupFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {groups.map((g) => (
        <button
          key={g.label}
          onClick={() => onChange(g.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            selected === g.value
              ? "bg-accent text-white"
              : "bg-surface-secondary text-slate-400 hover:text-slate-200"
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
