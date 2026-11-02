// Building blocks of Pulse's visual language (see design/tokens.json → components).
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Status } from '../lib/status';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'default' | 'large';
  variant?: 'primary' | 'secondary';
  icon?: '↗' | '→' | null;
};

/** White block button with black text; a large variant for the main call to action. */
export function Button({ size = 'default', variant = 'primary', icon = null, className = '', children, ...rest }: ButtonProps) {
  // Padding 10/12/6 so the cap height sits optically centred; large CTAs use 16/20.
  const pad = size === 'large' ? 'px-5 py-4' : 'px-3 pb-1.5 pt-2.5';
  // Secondary: outlined, so it never competes with the step's one primary action.
  const look = variant === 'secondary' ? 'border border-hairline text-ink' : 'bg-bg-alt text-ink-on-light';
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 text-small disabled:opacity-50 ${look} ${pad} ${className}`}
      {...rest}
    >
      {children}
      {icon && <span aria-hidden="true">{icon}</span>}
    </button>
  );
}

/** Text link with a 1px underline rule and an arrow. */
export function LinkArrow({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const cls = 'inline-flex items-center gap-2 border-b border-ink py-0.5 text-small text-ink';
  return href ? (
    <a href={href} className={cls}>
      {children} <span aria-hidden="true">→</span>
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children} <span aria-hidden="true">→</span>
    </button>
  );
}

/** Filter tab. Selected = white fill. */
export function Chip({ selected, children, onClick }: { selected?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-9 border border-hairline px-3 pb-1.5 pt-2.5 text-small ${selected ? 'bg-bg-alt text-ink-on-light' : 'text-ink'}`}
    >
      {children}
    </button>
  );
}

/** Small white title + grey subtitle at the top-left of a section, optional action at the right. */
export function SectionHeader({ title, subtitle, action, level = 2, id }: { title: string; subtitle?: string; action?: ReactNode; level?: 1 | 2; id?: string }) {
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-page pb-cell pt-block">
      <div>
        <H id={id} className="text-small">
          {title}
        </H>
        {subtitle && <p className="text-small text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Number cell: grey label at the top, the value at the bottom. */
export function NumberCell({
  label,
  value,
  caption,
  size = 'medium',
  minHeight = 'min-h-[12rem]',
}: {
  label?: string;
  value: ReactNode;
  caption?: ReactNode;
  size?: 'medium' | 'large';
  minHeight?: string;
}) {
  return (
    <div className={`cell flex flex-col justify-between gap-6 ${minHeight}`}>
      {label ? <p className="text-small text-ink-2">{label}</p> : <span />}
      <div>
        <p className={size === 'large' ? 'text-large' : 'text-medium'}>{value}</p>
        {caption && <p className="mt-1 text-small text-ink-2">{caption}</p>}
      </div>
    </div>
  );
}

export type { Status };

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  on_track: { label: 'On track', color: 'var(--pulse-status-on-track)' },
  at_risk: { label: 'At risk', color: 'var(--pulse-status-at-risk)' },
  off_track: { label: 'Off track', color: 'var(--pulse-status-off-track)' },
  missing: { label: 'Missing', color: 'var(--pulse-status-missing)' },
};

function StatusIcon({ status }: { status: Status }) {
  const c = STATUS_META[status].color;
  const common = { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true as const };
  switch (status) {
    case 'on_track':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="7" fill={c} />
          <path d="M3.8 7.2l2.1 2.1 4.3-4.6" stroke="#000" strokeWidth="1.6" fill="none" />
        </svg>
      );
    case 'at_risk':
      return (
        <svg {...common}>
          <path d="M7 0.8L13.4 12.8H0.6Z" fill={c} />
          <path d="M7 5v3.6M7 10.2v1" stroke="#000" strokeWidth="1.6" />
        </svg>
      );
    case 'off_track':
      return (
        <svg {...common}>
          <rect width="14" height="14" fill={c} />
          <path d="M4 4l6 6M10 4l-6 6" stroke="#000" strokeWidth="1.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6.25" stroke={c} strokeWidth="1.5" fill="none" />
          <path d="M4.5 7h5" stroke={c} strokeWidth="1.5" />
        </svg>
      );
  }
}

/** Status is always icon + text; the text stays in ink, the colour sits on the icon only. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap border border-hairline px-2 pb-0.5 pt-1 text-small">
      <StatusIcon status={status} />
      {STATUS_META[status].label}
    </span>
  );
}
