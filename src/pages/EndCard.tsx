import { useDocumentTitle } from '../components/Layout';

/** Closing card of the 60-second demo. Not linked from the app. */
export default function EndCard() {
  useDocumentTitle('');
  return (
    <section className="flex min-h-[70vh] flex-col justify-center px-page py-block">
      <h1 className="text-display">One check-in, two answers.</h1>
      <p className="mt-8 text-medium text-ink-2">A concept by Dennis Schülting.</p>
    </section>
  );
}
