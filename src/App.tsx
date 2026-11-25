import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { SITE_BASE, fetchObservatorySnapshot } from './api/pnpClient';
import { AttackLinesSection } from './components/AttackLinesSection';
import { DistanceBanner } from './components/DistanceBanner';
import { FleetPulsePanel } from './components/FleetPulsePanel';
import { InspectorDrawer } from './components/InspectorDrawer';
import { Masthead } from './components/Masthead';
import { MomentumAndNews } from './components/MomentumAndNews';
import { ProgramsGrid } from './components/ProgramsGrid';
import { SituationHero } from './components/SituationHero';
import type { DrawerView, ObservatorySnapshot } from './types/pnp';
import { fmtUtcTime } from './utils/format';

const POLL_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 3 * 60_000;

export const App: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ObservatorySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [drawerStack, setDrawerStack] = useState<DrawerView[]>([]);
  const mountedRef = useRef(true);

  const loadSnapshot = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const next = await fetchObservatorySnapshot();
      if (!mountedRef.current) return;
      setSnapshot(next);
      setError(null);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Unable to reach data.pequalnp.com');
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadSnapshot(false);

    const pollTimer = window.setInterval(() => {
      if (!document.hidden) loadSnapshot(false);
    }, POLL_INTERVAL_MS);

    const tickTimer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 10_000);

    const onVisibility = () => {
      if (!document.hidden) loadSnapshot(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollTimer);
      window.clearInterval(tickTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadSnapshot]);

  const pushDrawer = useCallback((view: DrawerView) => {
    setDrawerStack((prev) => [...prev, view]);
  }, []);

  const popDrawer = useCallback(() => {
    setDrawerStack((prev) => prev.slice(0, -1));
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerStack([]);
  }, []);

  // Initial Loading State
  if (!snapshot && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[var(--color-paper)]">
        <Loader2 className="h-7 w-7 animate-spin text-stone-400 mb-3" />
        <h1 className="font-serif text-2xl font-semibold text-stone-900">
          Connecting to P vs NP Live Record
        </h1>
        <p className="mt-1.5 text-sm text-stone-500">
          Reading real-time fleet status, research fronts, and Lean 4 checker logs from data.pequalnp.com...
        </p>
      </div>
    );
  }

  // Initial Error State
  if (!snapshot && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[var(--color-paper)]">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-xs">
          <AlertTriangle className="h-7 w-7 text-rose-600 mx-auto mb-3" />
          <h1 className="font-serif text-xl font-semibold text-stone-900">
            Could not load live data
          </h1>
          <p className="mt-2 text-sm text-stone-600">{error}</p>
          <button
            type="button"
            onClick={() => loadSnapshot(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const dataAtIso = snapshot.head.checked_at ?? snapshot.head.generated_at;
  const dataAgeMs = nowMs - Date.parse(dataAtIso);
  const isStale = Boolean(error) || (!Number.isNaN(dataAgeMs) && dataAgeMs > STALE_THRESHOLD_MS);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-paper)] overflow-x-clip">
      <Masthead
        head={snapshot.head}
        live={snapshot.live}
        isStale={isStale}
        isRefreshing={isRefreshing}
        lastSyncedAt={snapshot.fetchedAt}
        nowMs={nowMs}
        onRefresh={() => loadSnapshot(true)}
        onOpenMessages={() => pushDrawer({ kind: 'messages' })}
        onOpenChecker={() => pushDrawer({ kind: 'checker', filterAccepted: 'all' })}
        onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
      />

      {/* Non-blocking sync warning if a background poll failed */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900">
          Temporarily unable to refresh ({error}). Showing last synced snapshot from{' '}
          {fmtUtcTime(snapshot.head.generated_at)} — retrying automatically.
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-10">
        {/* Layer 0: Honest Distance Headline, 5-Rung Ladder & 30-Sec Plain-English Guide */}
        <DistanceBanner
          head={snapshot.head}
          map={snapshot.map}
          plan={snapshot.plan}
          onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
          onSelectProgram={(programId) => pushDrawer({ kind: 'program', programId })}
        />

        {/* Layer 1: Live Situation Briefing + Vital Metrics & Checker Pulse */}
        <SituationHero
          head={snapshot.head}
          live={snapshot.live}
          map={snapshot.map}
          incident={snapshot.incident}
          nowMs={nowMs}
          onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
          onSelectSeat={(seatId) => pushDrawer({ kind: 'seat', seatId })}
          onOpenChecker={() => pushDrawer({ kind: 'checker', filterAccepted: 'all' })}
        />

        {/* Layer 2: The 6 Research Fronts ("The Battle Map") */}
        <ProgramsGrid
          map={snapshot.map}
          plan={snapshot.plan}
          live={snapshot.live}
          onSelectProgram={(programId) => pushDrawer({ kind: 'program', programId })}
        />

        {/* Layer 3: Active Attack Lines vs. Dead Ends */}
        <AttackLinesSection
          map={snapshot.map}
          onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
          onSelectProgram={(programId) => pushDrawer({ kind: 'program', programId })}
        />

        {/* Layer 4: Two-Column Lower Section — Momentum & Dispatches + Simplified Live Fleet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <div className="lg:col-span-7">
            <MomentumAndNews
              calendarMonth={snapshot.calendarMonth}
              news={snapshot.news}
              papers={snapshot.papers}
              nowMs={nowMs}
              onSelectArticle={(article) => pushDrawer({ kind: 'article', article })}
              onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
            />
          </div>
          <div className="lg:col-span-5">
            <FleetPulsePanel
              head={snapshot.head}
              live={snapshot.live}
              nowMs={nowMs}
              onSelectSeat={(seatId) => pushDrawer({ kind: 'seat', seatId })}
              onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
              onOpenMessages={() => pushDrawer({ kind: 'messages' })}
              onOpenChecker={() => pushDrawer({ kind: 'checker', filterAccepted: 'all' })}
            />
          </div>
        </div>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="mt-8 border-t border-[var(--color-hairline)] bg-white/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-500">
          <p>
            <strong className="font-serif font-semibold text-stone-800">P vs NP · Live Observatory</strong>{' '}
            — independent reader-friendly view of the live public data feed at{' '}
            <a
              href={`${SITE_BASE}live`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-stone-300 underline-offset-2 hover:text-stone-900 inline-flex items-center gap-0.5"
            >
              pequalnp.com
              <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
          <p className="font-mono text-[11px] text-stone-400 tabular-nums">
            Record {snapshot.head.version} · {fmtUtcTime(snapshot.head.generated_at)} · auto-sync 30s
          </p>
        </div>
      </footer>

      {/* Universal Slide-Over Deep-Dive Inspector */}
      <InspectorDrawer
        stack={drawerStack}
        snapshot={snapshot}
        nowMs={nowMs}
        onPush={pushDrawer}
        onPop={popDrawer}
        onClose={closeDrawer}
      />
    </div>
  );
};

export default App;
