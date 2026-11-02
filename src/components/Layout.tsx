import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useStore } from '../state/store';

export const BANNER_TEXT = 'Concept prototype · invented data';

/** Shown on every page. */
export function Banner() {
  return (
    <div role="note" className="border-b border-hairline bg-neutral-darker px-page py-1.5 text-tiny text-ink">
      {BANNER_TEXT}
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/impact', label: 'Impact review' },
  { to: '/platform', label: 'Platform inbox' },
];

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Pulse` : 'Pulse';
  }, [title]);
}

function ResetButton() {
  const { reset } = useStore();
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        type="button"
        className="p-3 text-small text-ink-2"
        onClick={() => {
          reset();
          setDone(true);
          window.setTimeout(() => setDone(false), 2500);
        }}
      >
        {done ? 'Demo data reset' : 'Reset demo data'}
      </button>
      <span className="sr-only" aria-live="polite">
        {done ? 'Demo data reset to the starting point.' : ''}
      </span>
    </>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { persisted } = useStore();
  return (
    <div className="flex min-h-screen flex-col">
      <Banner />
      <header className="flex flex-col border-b border-hairline px-page sm:flex-row sm:items-start sm:justify-between">
        {/* No logo or wordmark: the product is Pulse, named in plain text. */}
        <Link to="/" className="py-3">
          <span className="block text-small font-bold">Pulse</span>
          <span className="block text-small text-ink-2">A platform concept for an impact-focused VC fund</span>
        </Link>
        <nav aria-label="Main" className="-ml-3 flex flex-wrap items-center sm:ml-0 sm:justify-end">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `p-3 text-small ${isActive ? 'text-ink' : 'text-ink-2'}`}>
              {n.label}
            </NavLink>
          ))}
          <ResetButton />
        </nav>
      </header>
      {!persisted && (
        <p role="status" className="border-b border-hairline px-page py-2 text-small text-ink-2">
          This browser blocks storage, so the demo keeps changes only until you close the tab.
        </p>
      )}
      {/* min-w-0 stops wide content stretching the flex column; tables scroll inside their own positioned wrapper. */}
      <main className="min-w-0 flex-1">{children}</main>
      <footer className="mt-block flex flex-wrap justify-between gap-2 border-t border-hairline px-page py-cell text-small text-ink-2">
        <span>Pulse · a platform concept for an impact-focused VC fund, by Dennis Schülting. All companies, people and figures are invented.</span>
      </footer>
    </div>
  );
}

/** Second banner in the founder flow. */
export function DemoNotice() {
  return (
    <p role="note" className="border-b border-hairline px-page py-2 text-small text-ink">
      Demo: nothing you enter leaves your browser.
    </p>
  );
}
