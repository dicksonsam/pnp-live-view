import React, { useState } from 'react';
import {
  Activity,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { LEMMA_ID_RE, SITE_BASE } from '../api/pnpClient';
import type { HeadData, LiveData } from '../types/pnp';
import { campaignDayNumber, fmtNumber, fmtRelativeTime } from '../utils/format';

interface MastheadProps {
  head: HeadData;
  live: LiveData;
  isStale: boolean;
  isRefreshing: boolean;
  lastSyncedAt: number;
  nowMs: number;
  onRefresh: () => void;
  onOpenMessages: () => void;
  onOpenChecker: () => void;
  onSelectLemma: (lemmaId: string) => void;
}

export const Masthead: React.FC<MastheadProps> = ({
  head,
  live,
  isStale,
  isRefreshing,
  lastSyncedAt,
  nowMs,
  onRefresh,
  onOpenMessages,
  onOpenChecker,
  onSelectLemma,
}) => {
  const [lookup, setLookup] = useState('');
  const [lookupError, setLookupError] = useState(false);

  const dayNum = campaignDayNumber(head.started_at, nowMs);
  const syncedAgo = fmtRelativeTime(new Date(lastSyncedAt).toISOString(), nowMs);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookup.trim();
    if (!cleaned) return;
    if (LEMMA_ID_RE.test(cleaned)) {
      setLookupError(false);
      onSelectLemma(cleaned);
      setLookup('');
    } else {
      setLookupError(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-hairline)] bg-[var(--color-paper)]/92 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          {/* Brand & Status */}
          <div className="flex items-center gap-3.5">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                  P vs NP <span className="font-normal text-stone-400">·</span> Live Observatory
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-medium text-stone-600">
                  Day {dayNum}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isStale ? 'bg-amber-500' : 'bg-emerald-500 animate-live-dot'
                    }`}
                  />
                  <span className="font-medium text-stone-700">
                    {isStale ? 'Feed paused / stale' : 'Live feed'}
                  </span>
                </span>
                <span>·</span>
                <span className="tabular-nums">synced {syncedAgo}</span>
                <span className="hidden md:inline">·</span>
                <a
                  href={`${SITE_BASE}live`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1 hover:text-stone-900 underline decoration-stone-300 underline-offset-2 transition-colors"
                >
                  Source: pequalnp.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right controls: Quick Lemma Lookup + Deep-dive Drawers + Refresh */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <form onSubmit={handleLookupSubmit} className="relative flex-1 min-w-0 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={lookup}
                onChange={(e) => {
                  setLookup(e.target.value);
                  if (lookupError) setLookupError(false);
                }}
                placeholder="Lemma ID (e.g. L-meta-1629)"
                aria-label="Inspect lemma by ID"
                className={`w-full sm:w-60 rounded-lg border bg-white pl-8 pr-3 py-1.5 text-xs font-mono text-stone-800 placeholder:font-sans placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all ${
                  lookupError
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-[var(--color-hairline-strong)] focus:border-stone-500 focus:ring-stone-200'
                }`}
              />
            </form>

            <button
              type="button"
              onClick={onOpenMessages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-hairline-strong)] bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors cursor-pointer"
              title="Open live inter-agent message stream"
            >
              <MessageSquare className="h-3.5 w-3.5 text-stone-500" />
              <span className="hidden sm:inline">Messages</span>
              <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-stone-600">
                {fmtNumber(live.messages.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenChecker}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-hairline-strong)] bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors cursor-pointer"
              title="Open last hour of Lean 4 checker runs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Checker</span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-emerald-700">
                {fmtNumber(live.checker_runs.length)}/hr
              </span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh live data now"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--color-hairline-strong)] bg-white p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 transition-colors cursor-pointer"
              title="Refresh live data (auto-refreshes every 30s)"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quiet navigation anchors + honest P vs NP status */}
        <div className="flex items-center justify-between gap-4 border-t border-[var(--color-hairline)]/70 py-2 text-xs min-w-0">
          <nav className="flex items-center gap-4 sm:gap-5 overflow-x-auto min-w-0 text-stone-600">
            <a href="#distance" className="hover:text-stone-950 font-medium whitespace-nowrap transition-colors">
              Distance to P vs NP
            </a>
            <a href="#briefing" className="hover:text-stone-950 font-medium whitespace-nowrap transition-colors">
              Situation Report
            </a>
            <a href="#fronts" className="hover:text-stone-950 font-medium whitespace-nowrap transition-colors">
              6 Research Fronts
            </a>
            <a href="#attacks" className="hover:text-stone-950 font-medium whitespace-nowrap transition-colors">
              Active vs. Dead Lines
            </a>
            <a href="#momentum" className="hover:text-stone-950 font-medium whitespace-nowrap transition-colors">
              Momentum &amp; Dispatches
            </a>
            <a href="#fleet" className="hover:text-stone-950 font-medium whitespace-nowrap transition-colors">
              Live Fleet
            </a>
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-stone-500 whitespace-nowrap">
            <Activity className="h-3.5 w-3.5 text-stone-400" />
            <span>
              Status:{' '}
              <strong className="font-semibold text-stone-800">
                {head.breakthrough ? 'Breakthrough Released' : 'P vs NP remains open'}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
