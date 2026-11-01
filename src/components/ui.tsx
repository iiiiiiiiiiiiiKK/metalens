import { useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check, Copy, X as XIcon } from 'lucide-react';
import type { Status } from '../lib/types';

/* ------------------------------------------------------------------ button -- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:brightness-110 active:brightness-95 border border-transparent shadow-sm',
  secondary: 'bg-elevated text-fg hover:bg-line border border-line hover:border-line-strong',
  ghost: 'bg-transparent text-muted hover:text-fg hover:bg-elevated border border-transparent',
  danger: 'bg-transparent text-err hover:bg-err/10 border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-lg',
  // 44px tall on touch devices keeps every tap target comfortable.
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  icon: 'h-10 w-10 justify-center rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex select-none items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        VARIANTS[variant]
      } ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------- badge -- */

const STATUS_STYLES: Record<Status, string> = {
  ok: 'text-ok bg-ok/12 border-ok/25',
  missing: 'text-err bg-err/12 border-err/25',
  warning: 'text-warn bg-warn/12 border-warn/25',
  unverified: 'text-unknown bg-unknown/12 border-unknown/25',
};

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

export function StatusDot({ status, className = '' }: { status: Status; className?: string }) {
  const color =
    status === 'ok'
      ? 'bg-ok'
      : status === 'missing'
        ? 'bg-err'
        : status === 'warning'
          ? 'bg-warn'
          : 'bg-unknown';
  return (
    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color} ${className}`} aria-hidden />
  );
}

/* -------------------------------------------------------------------- card -- */

export function Panel({
  children,
  className = '',
  id,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: 'section' | 'div' | 'aside';
}) {
  return (
    <Tag id={id} className={`rounded-xl border border-line bg-surface ${className}`}>
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  subtitle,
  right,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-3.5 py-2.5 sm:px-4">
      <div className="min-w-0">
        <h2 id={id} className="text-[13px] font-semibold tracking-tight text-fg">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-1.5">{right}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ dialog -- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-bg shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="close">
            <XIcon size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 text-[13px] leading-relaxed text-muted">
          {children}
        </div>
        {footer ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- toast -- */

export function Toast({ message, tone = 'ok' }: { message: string; tone?: 'ok' | 'err' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-5 z-[60] mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-medium shadow-lg backdrop-blur ${
        tone === 'ok' ? 'border-ok/30 bg-ok/15 text-ok' : 'border-err/30 bg-err/15 text-err'
      }`}
    >
      {tone === 'ok' ? <Check size={14} /> : <XIcon size={14} />}
      <span className="truncate">{message}</span>
    </div>
  );
}

/* --------------------------------------------------------------- copy hook -- */

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function useCopy(onResult?: (ok: boolean) => void) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string, id = 'default') => {
      const ok = await copyToClipboard(text);
      onResult?.(ok);
      if (ok) {
        setCopied(id);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(null), 1600);
      }
      return ok;
    },
    [onResult],
  );

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return { copy, copied };
}

export function CopyButton({
  text,
  label,
  copiedLabel,
  onCopied,
  size = 'sm',
  variant = 'secondary',
}: {
  text: string;
  label: string;
  copiedLabel: string;
  onCopied?: (ok: boolean) => void;
  size?: Size;
  variant?: Variant;
}) {
  const { copy, copied } = useCopy(onCopied);
  return (
    <Button variant={variant} size={size} onClick={() => void copy(text)} aria-label={label}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span className="hidden sm:inline">{copied ? copiedLabel : label}</span>
    </Button>
  );
}

/* ------------------------------------------------------------- segmented -- */

export interface SegmentedItem<T extends string> {
  value: T;
  label: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  scroll = false,
  size = 'md',
}: {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  scroll?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-full min-w-0 items-center gap-0.5 rounded-xl border border-line bg-elevated p-0.5 ${
        scroll ? 'scroll-x' : ''
      }`}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-medium transition-colors ${
              size === 'sm' ? 'h-8 px-2 text-[12px]' : 'h-9 px-2.5 text-[12.5px]'
            } ${
              active
                ? 'bg-surface text-fg shadow-sm ring-1 ring-line'
                : 'text-muted hover:text-fg'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ misc -- */

export function Empty({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
      {icon ? <div className="mb-1 text-faint">{icon}</div> : null}
      <p className="text-[13px] font-medium text-fg">{title}</p>
      {children ? (
        <p className="max-w-sm text-[12px] leading-relaxed text-muted">{children}</p>
      ) : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-elevated px-1 py-0.5 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}
