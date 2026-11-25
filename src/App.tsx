import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { SITE_BASE, fetchAtlasSnapshot } from './api/pnpClient';
import { BreakthroughMap } from './components/BreakthroughMap';
import { InspectorDrawer } from './components/InspectorDrawer';
import { ProofRealitySection } from './components/ProofRealitySection';
import { StrategyExplorer } from './components/StrategyExplorer';
import { TopBar } from './components/TopBar';
import { VelocityAndTeams } from './components/VelocityAndTeams';
import { VerdictHero } from './components/VerdictHero';
import type { AtlasSnapshot, DrawerView } from './types/pnp';
import { fmtUtcTime } from './utils/format';

const POLL_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 3 * 60_000;

export const App: React.FC = () => {
  const [snapshot, setSnapshot] = useState<AtlasSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [drawerStack, setDrawerStack] = useState<DrawerView[]>([]);
  const mountedRef = useRef(true);

  const loadSnapshot = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const next = await fetchAtlasSnapshot();
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

  if (!snapshot && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400 mb-3" />
        <h1 className="font-[var(--font-display)] text-2xl font-bold text-white">
          Loading P vs NP Visual Atlas
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Streaming live telemetry from data.pequalnp.com...
        </p>
      </div>
    );
  }

  if (!snapshot && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-rose-500/40 bg-[#0E1525] p-6">
          <AlertTriangle className="h-7 w-7 text-rose-400 mx-auto mb-3" />
          <h1 className="font-[var(--font-display)] text-xl font-bold text-white">
            Could not load live telemetry
          </h1>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => loadSnapshot(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
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
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <TopBar
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

      {error && (
        <div className="bg-amber-500/15 border-b border-amber-400/30 px-4 py-2 text-center text-xs text-amber-200">
          Temporarily unable to refresh ({error}). Showing snapshot from{' '}
          {fmtUtcTime(snapshot.head.generated_at)} — retrying automatically.
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-10">
        {/* Layer 1: Synthesized Live Verdict & Instrument Gauges */}
        <VerdictHero
          head={snapshot.head}
          live={snapshot.live}
          map={snapshot.map}
          incident={snapshot.incident}
          onOpenChecker={() => pushDrawer({ kind: 'checker', filterAccepted: 'all' })}
        />

        {/* Layer 2: Interactive SVG Visual Map of How P vs NP Could Be Solved */}
        <BreakthroughMap
          head={snapshot.head}
          live={snapshot.live}
          map={snapshot.map}
          onSelectProgram={(programId) => pushDrawer({ kind: 'program', programId })}
          onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
        />

        {/* Layer 3: Proof Allocation Reality Check + Last 60 Min Activity Translator */}
        <ProofRealitySection
          head={snapshot.head}
          live={snapshot.live}
          map={snapshot.map}
          nowMs={nowMs}
          onSelectProgram={(programId) => pushDrawer({ kind: 'program', programId })}
          onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
          onSelectSeat={(seatId) => pushDrawer({ kind: 'seat', seatId })}
          onOpenChecker={() => pushDrawer({ kind: 'checker', filterAccepted: 'all' })}
        />

        {/* Layer 4: Six Research Fronts + Strategy Survival Radar */}
        <StrategyExplorer
          map={snapshot.map}
          plan={snapshot.plan}
          live={snapshot.live}
          onSelectProgram={(programId) => pushDrawer({ kind: 'program', programId })}
          onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
        />

        {/* Layer 5: Campaign Velocity, Dispatches & Simplified Live Teams */}
        <VelocityAndTeams
          head={snapshot.head}
          live={snapshot.live}
          calendarMonth={snapshot.calendarMonth}
          news={snapshot.news}
          nowMs={nowMs}
          onSelectSeat={(seatId) => pushDrawer({ kind: 'seat', seatId })}
          onSelectLemma={(lemmaId) => pushDrawer({ kind: 'lemma', lemmaId })}
          onSelectArticle={(article) => pushDrawer({ kind: 'article', article })}
          onOpenMessages={() => pushDrawer({ kind: 'messages' })}
          onOpenChecker={() => pushDrawer({ kind: 'checker', filterAccepted: 'all' })}
        />
      </main>

      <footer className="mt-8 border-t border-[var(--color-border-subtle)] bg-[#060911]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            <strong className="font-[var(--font-display)] text-white">P vs NP · Visual Atlas</strong>{' '}
            — independent visual telemetry &amp; plain-English explainer powered by the live public feed at{' '}
            <a
              href={`${SITE_BASE}live`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline inline-flex items-center gap-0.5"
            >
              pequalnp.com
              <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
          <p className="font-mono text-[11px] text-slate-500 tabular-nums">
            Snapshot {snapshot.head.version} · {fmtUtcTime(snapshot.head.generated_at)} · auto-sync 30s
          </p>
        </div>
      </footer>

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
