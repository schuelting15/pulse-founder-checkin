import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Side panel as a modal dialog: Esc closes, focus moves in and returns to the opener on close. */
export function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('[data-autofocus], button, a, input, textarea, select')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        // Keep focus inside the dialog.
        const f = [...panel.current.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'));
        if (f.length === 0) return;
        if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="relative flex h-full w-full max-w-[44rem] flex-col overflow-y-auto border-l border-hairline bg-bg"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-hairline bg-bg p-cell">
          <div>
            <h2 id={`${id}-title`} className="text-medium">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-small text-ink-2">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-small text-ink-2" aria-label="Close">
            Close ✕
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
