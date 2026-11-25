import React, { useState } from 'react';
import {
  Compass,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { LEMMA_ID_RE, SITE_BASE } from '../api/pnpClient';
import type { HeadData, LiveData } from '../types/pnp';
import { campaignDayNumber, fmtNumber, fmtRelativeTime } from '../utils/format';

interface TopBarProps {
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

export const TopBar: React.FC<TopBarProps> = ({
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

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookup.trim();
    if (!trimmed) return;
    if (LEMMA_ID_RE.test(trimmed)) {
      setLookupError(false);
      onSelectLemma(trimmed);
      setLookup('');
    } else {
      setLookupError(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border-subtle)] bg-[var(--color-canvas)]/88 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-[var(--font-display)] text-lg sm:text-xl font-bold tracking-tight text-white">
                  P vs NP <span className="text-sky-400">Atlas</span>
                </h1>
                <span className="rounded-md bg-slate-800/90 border border-slate-700 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-300">
                  Day {dayNum}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isStale ? 'bg-amber-400' : 'bg-emerald-400 animate-signal'
                    }`}
                  />
                  <span className="font-medium text-slate-300">
                    {isStale ? 'Feed paused' : 'Live telemetry'}
                  </span>
                </span>
                <span>·</span>
                <span className="tabular-nums">synced {syncedAgo}</span>
                <span className="hidden md:inline">·</span>
                <a
                  href={`${SITE_BASE}live`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors"
                >
                  Data: pequalnp.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Instrument Controls */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <form onSubmit={handleLookup} className="relative flex-1 min-w-0 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={lookup}
                onChange={(e) => {
                  setLookup(e.target.value);
                  if (lookupError) setLookupError(false);
                }}
                placeholder="Lemma ID (L-clb-036)"
                aria-label="Inspect lemma by ID"
                className={`w-full sm:w-52 rounded-lg border bg-[var(--color-panel)] pl-8 pr-3 py-1.5 text-xs font-mono text-slate-100 placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  lookupError
                    ? 'border-rose-500/80 focus:ring-rose-500/30'
                    : 'border-[var(--color-border-subtle)] focus:border-sky-400/70 focus:ring-sky-500/20'
                }`}
              />
            </form>

            <button
              type="button"
              onClick={onOpenMessages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-400/40 hover:bg-[var(--color-panel-elevated)] transition-colors cursor-pointer"
              title="Inspect raw inter-agent messages"
            >
              <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Chatter</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-slate-300">
                {fmtNumber(live.messages.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenChecker}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-400/40 hover:bg-[var(--color-panel-elevated)] transition-colors cursor-pointer"
              title="Inspect last hour of Lean 4 checker runs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Checker</span>
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-emerald-300">
                {fmtNumber(live.checker_runs.length)}/hr
              </span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh telemetry"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel)] p-1.5 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border-subtle)]/70 py-2 text-xs min-w-0">
          <nav className="flex items-center gap-5 overflow-x-auto min-w-0 text-slate-400">
            <a href="#verdict" className="hover:text-sky-300 font-medium whitespace-nowrap transition-colors">
              Status Verdict
            </a>
            <a href="#atlas-map" className="hover:text-sky-300 font-medium whitespace-nowrap transition-colors">
              Path to Solving P vs NP
            </a>
            <a href="#reality-check" className="hover:text-sky-300 font-medium whitespace-nowrap transition-colors">
              Where the Proofs Went
            </a>
            <a href="#strategies" className="hover:text-sky-300 font-medium whitespace-nowrap transition-colors">
              Fronts &amp; Dead Ends
            </a>
            <a href="#pulse" className="hover:text-sky-300 font-medium whitespace-nowrap transition-colors">
              Velocity &amp; Teams
            </a>
          </nav>

          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 whitespace-nowrap">
            VERDICT:{' '}
            <strong className={head.breakthrough ? 'text-emerald-400' : 'text-amber-300'}>
              {head.breakthrough ? 'RESULT RELEASED' : 'STILL OPEN · BASE CAMP'}
            </strong>
          </span>
        </div>
      </div>
    </header>
  );
};
