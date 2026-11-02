import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import CheckIn from './pages/CheckIn';
import { Landing } from './pages/Landing';
import { StoreProvider } from './state/store';

// The founder check-in is in the main bundle: it is the screen founders open, often on a phone.
// The team screens load on demand; Recharts loads only where a chart is drawn.
const ImpactReview = lazy(() => import('./pages/ImpactReview'));
const PlatformInbox = lazy(() => import('./pages/PlatformInbox'));
const EndCard = lazy(() => import('./pages/EndCard'));

export function App() {
  return (
    <StoreProvider>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Suspense fallback={<p className="min-h-screen px-page py-block text-small text-ink-2">Loading…</p>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/check-in/:companyId" element={<CheckIn />} />
              <Route path="/impact" element={<ImpactReview />} />
              <Route path="/platform" element={<PlatformInbox />} />
              <Route path="/end" element={<EndCard />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </StoreProvider>
  );
}
