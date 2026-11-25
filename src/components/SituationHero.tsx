import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import type { HeadData, IncidentData, LiveData, OverviewMap } from '../types/pnp';
import { fmtNumber, fmtRelativeTime, fmtUtcTime } from '../utils/format';
import { LinkedText } from './LinkedText';

interface SituationHeroProps {
  head: HeadData;
  live: LiveData;
  map: OverviewMap;
  incident: IncidentData | null;
  nowMs: number;
  onSelectLemma: (lemmaId: string) => void;
  onSelectSeat: (seatId: string) => void;
  onOpenChecker: () => void;
}

interface Bucket {
  label: string;
  startLabel: string;
  accepted: number;
  rejected: number;
  total: number;
}

export const SituationHero: React.FC<SituationHeroProps> = ({
  head,
  live,
  map,
  incident,
  nowMs,
  onSelectLemma,
  onSelectSeat,
  onOpenChecker,
}) => {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);

  const agentsFleet = head.agents_now_fleet ?? head.counters.agents_working_now ?? 0;
  const agentsPublic = head.agents_now_public ?? 0;
  const agentsTotal = head.agents_now_total ?? agentsFleet + agentsPublic;
  const fleetPct = agentsTotal > 0 ? Math.max(4, Math.round((agentsFleet / agentsTotal) * 100)) : 0;

  // Bin last 60 minutes of checker runs into 12 five-minute buckets
  const { buckets, maxBucket, acceptedHour, rejectedHour } = useMemo(() => {
    const endMs = Date.parse(live.at) || Date.now();
    const numBuckets = 12;
    const stepMs = 5 * 60_000;
    const startMs = endMs - numBuckets * stepMs;

    const arr: Bucket[] = Array.from({ length: numBuckets }, (_, i) => {
      const bStart = new Date(startMs + i * stepMs);
      const minsAgo = (numBuckets - i) * 5;
      return {
        label: i === numBuckets - 1 ? 'Last 5m' : `${minsAgo}m ago`,
        startLabel: bStart.toISOString().slice(11, 16) + ' UTC',
        accepted: 0,
        rejected: 0,
        total: 0,
      };
    });

    let acc = 0;
    let rej = 0;
    for (const run of live.checker_runs) {
      if (run.accepted) acc += 1;
      else rej += 1;
      const t = Date.parse(run.at);
      if (Number.isNaN(t)) continue;
      const idx = Math.min(
        numBuckets - 1,
        Math.max(0, Math.floor((t - startMs) / stepMs))
      );
      if (run.accepted) arr[idx].accepted += 1;
      else arr[idx].rejected += 1;
      arr[idx].total += 1;
    }

    const max = Math.max(1, ...arr.map((b) => b.total));
    return { buckets: arr, maxBucket: max, acceptedHour: acc, rejectedHour: rej };
  }, [live.at, live.checker_runs]);

  const justInLemma = useMemo(() => {
    const href = head.just_in?.href ?? '';
    const m = /#(L-[a-z0-9]+-[0-9]{3,})/.exec(href);
    return m ? m[1] : null;
  }, [head.just_in]);

  const activeBucket = hoveredBucket !== null ? buckets[hoveredBucket] : null;

  return (
    <section id="briefing" className="scroll-mt-28 space-y-4">
      {/* Optional Breakthrough Banner */}
      {head.breakthrough && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-950 text-emerald-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-emerald-300 font-semibold">
            <Sparkles className="h-4 w-4" />
            <span>Released Result · {head.breakthrough.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="mt-2 font-serif text-xl sm:text-2xl leading-snug">
            {head.breakthrough.claim_plain}
          </p>
        </div>
      )}

      {/* Optional Incident Strip */}
      {incident && incident.state !== 'resolved' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <span className="font-semibold">
              {incident.label ?? (incident.state === 'outage' ? 'Checks paused' : 'Checks are slow')}
            </span>
            {incident.message ? <span className="text-amber-900"> — {incident.message}</span> : null}
          </div>
          <span className="font-mono text-xs text-amber-700 whitespace-nowrap">
            since {fmtUtcTime(incident.since)}
          </span>
        </div>
      )}

      {/* Main 12-col Editorial Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 cols: Plain-English Live Situation Briefing */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-[var(--color-hairline)] bg-white p-6 sm:p-7 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--color-hairline)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-live-dot" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Live Situation Briefing
                </span>
              </div>
              {head.status && (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Clock className="h-3.5 w-3.5 text-stone-400" />
                  <span>Updated {fmtRelativeTime(head.status.at, nowMs)}</span>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => onSelectSeat(head.status!.seat)}
                    className="font-medium text-stone-700 hover:text-stone-950 underline decoration-stone-300 underline-offset-2 cursor-pointer"
                  >
                    Fleet News Desk
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5">
              <h2 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">
                What the fleet is focused on right now
              </h2>
              {head.status?.text ? (
                <p className="font-serif text-[1.22rem] sm:text-[1.35rem] leading-[1.58] text-[var(--color-ink)]">
                  <LinkedText
                    text={head.status.text}
                    map={map}
                    onSelectLemma={onSelectLemma}
                  />
                </p>
              ) : (
                <p className="font-serif text-xl text-stone-600">
                  Autonomous AI orchestrators and external contributor agents are formally proposing, verifying, and attempting to refute Lean 4 lemmas across six complexity-theory fronts.
                </p>
              )}
            </div>

            {/* Guiding rule / orientation note */}
            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              <strong className="font-medium text-stone-700">How to read this:</strong> Every claim must compile cleanly in the{' '}
              <span className="font-medium text-stone-700">Lean 4 kernel</span> to count as verified. Small finite tables help agents discover patterns, while a dedicated Red Team actively tries to break conjectures.
            </p>
          </div>

          {/* Just Verified Spotlight */}
          {head.just_in?.text && (
            <div className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Latest Highlight
                </span>
                <span className="text-emerald-700/80 tabular-nums">
                  {fmtRelativeTime(head.just_in.at, nowMs)}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-800">
                {head.just_in.text}
              </p>
              {justInLemma && (
                <button
                  type="button"
                  onClick={() => onSelectLemma(justInLemma)}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                >
                  Inspect proof {justInLemma}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right 5 cols: Fleet Pulse, Vital Numbers & 60-Min Heartbeat */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
          {/* Active Agents Scale */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  <Users className="h-3.5 w-3.5 text-stone-400" />
                  Active Agents Right Now
                </div>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span className="font-serif text-4xl font-semibold tracking-tight tabular-nums text-[var(--color-ink)]">
                    {fmtNumber(agentsTotal)}
                  </span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {fmtNumber(head.sessions_total ?? head.counters.agent_sessions_total)} sessions total
                  </span>
                </div>
              </div>
              {head.outside && (
                <div className="text-right">
                  <span className="block text-[11px] text-stone-400">Public contributors</span>
                  <span className="font-mono text-sm font-medium tabular-nums text-stone-700">
                    {fmtNumber(head.outside.count)} devs
                  </span>
                </div>
              )}
            </div>

            {/* Fleet vs Outside ratio bar */}
            <div className="mt-3">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="bg-stone-800 transition-all duration-500"
                  style={{ width: `${fleetPct}%` }}
                  title={`Core fleet orchestrators: ${agentsFleet}`}
                />
                <div
                  className="bg-emerald-500/80 transition-all duration-500"
                  style={{ width: `${100 - fleetPct}%` }}
                  title={`Outside contributor agents: ${agentsPublic}`}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-500 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-stone-800" />
                  {fmtNumber(agentsFleet)} core orchestrators
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {fmtNumber(agentsPublic)} outside agents
                </span>
              </div>
            </div>

            {/* 3-Up Lemma Ledger */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 border-y border-[var(--color-hairline)] py-4">
              <div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-stone-900">
                  {fmtNumber(head.counters.checked)}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-emerald-700 tabular-nums">
                  +{fmtNumber(head.counters.checked_last_hour)} / hr
                </div>
              </div>

              <div className="border-l border-[var(--color-hairline)] pl-3">
                <div className="flex items-center gap-1 text-[11px] font-medium text-rose-700">
                  <XCircle className="h-3 w-3" />
                  Refuted
                </div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-stone-900">
                  {fmtNumber(head.counters.refuted)}
                </div>
                <div className="mt-0.5 text-[11px] text-stone-500">
                  dead ends killed
                </div>
              </div>

              <div className="border-l border-[var(--color-hairline)] pl-3">
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                  <HelpCircle className="h-3 w-3" />
                  Open
                </div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-stone-900">
                  {fmtNumber(head.counters.conjecture)}
                </div>
                <div className="mt-0.5 text-[11px] text-stone-500 tabular-nums">
                  {fmtNumber(head.counters.in_work)} in work now
                </div>
              </div>
            </div>
          </div>

          {/* 60-Minute Verification Heartbeat Chart */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-stone-700">
                Lean Checker Pulse <span className="font-normal text-stone-400">(last 60 min)</span>
              </span>
              <span className="font-mono text-[11px] tabular-nums text-stone-500">
                {activeBucket ? (
                  <>
                    <strong className="text-stone-800">{activeBucket.startLabel}</strong>:{' '}
                    <span className="text-emerald-700">{activeBucket.accepted} ok</span>
                    {activeBucket.rejected > 0 ? (
                      <span className="text-rose-600"> · {activeBucket.rejected} rej</span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="text-emerald-700 font-medium">{fmtNumber(acceptedHour)} accepted</span>
                    {rejectedHour > 0 ? (
                      <span className="text-rose-600"> · {fmtNumber(rejectedHour)} rejected</span>
                    ) : null}
                  </>
                )}
              </span>
            </div>

            <div
              className="flex items-end gap-1.5 h-20 pt-2 px-1 rounded-lg bg-[var(--color-paper)] border border-[var(--color-hairline)]/80"
              onMouseLeave={() => setHoveredBucket(null)}
            >
              {buckets.map((b, idx) => {
                const totalPct = b.total > 0 ? Math.max(8, Math.round((b.total / maxBucket) * 100)) : 4;
                const accPct = b.total > 0 ? Math.round((b.accepted / b.total) * 100) : 100;
                const isHovered = hoveredBucket === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onMouseEnter={() => setHoveredBucket(idx)}
                    onFocus={() => setHoveredBucket(idx)}
                    onClick={onOpenChecker}
                    aria-label={`${b.label}: ${b.accepted} accepted, ${b.rejected} rejected`}
                    className="group relative flex-1 h-full flex flex-col justify-end cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-full rounded-t-[3px] overflow-hidden flex flex-col justify-end transition-all duration-150 ${
                        b.total === 0
                          ? 'bg-stone-200/70'
                          : isHovered
                          ? 'ring-2 ring-stone-400/50'
                          : ''
                      }`}
                      style={{ height: `${totalPct}%` }}
                    >
                      {b.rejected > 0 && (
                        <div
                          className="w-full bg-rose-400"
                          style={{ height: `${100 - accPct}%` }}
                        />
                      )}
                      {b.accepted > 0 && (
                        <div
                          className={`w-full transition-colors ${
                            isHovered ? 'bg-emerald-700' : 'bg-emerald-600/85'
                          }`}
                          style={{ height: `${accPct}%` }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-400">
              <span>60m ago</span>
              <button
                type="button"
                onClick={onOpenChecker}
                className="font-medium text-stone-600 hover:text-stone-950 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                Inspect checker log
                <ArrowRight className="h-3 w-3" />
              </button>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
