/** Tiny presentational bits shared by more than one panel. */
export function Gauge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 18a8 8 0 1 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 18l4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CountChip({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'ok' | 'warn' | 'err' | 'unknown';
}) {
  const color =
    tone === 'ok'
      ? 'text-ok border-ok/25 bg-ok/10'
      : tone === 'warn'
        ? 'text-warn border-warn/25 bg-warn/10'
        : tone === 'err'
          ? 'text-err border-err/25 bg-err/10'
          : 'text-muted border-line bg-elevated';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${color}`}
    >
      <span className="tnum font-semibold">{count}</span>
      {label}
    </span>
  );
}
