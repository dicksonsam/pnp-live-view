import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  PieChart,
  Radio,
} from 'lucide-react';
import { parseLemmaId } from '../api/pnpClient';
import type { HeadData, LiveData, OverviewMap } from '../types/pnp';
import { fmtNumber, fmtRelativeTime } from '../utils/format';
import { LinkedText } from './LinkedText';

interface ProofRealitySectionProps {
  head: HeadData;
  live: LiveData;
  map: OverviewMap;
  nowMs: number;
  onSelectProgram: (programId: string) => void;
  onSelectLemma: (lemmaId: string) => void;
  onSelectSeat: (seatId: string) => void;
  onOpenChecker: () => void;
}

export const ProofRealitySection: React.FC<ProofRealitySectionProps> = ({
  head,
  live,
  map,
  nowMs,
  onSelectProgram,
  onSelectLemma,
  onSelectSeat,
  onOpenChecker,
}) => {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);
  const [showVerbatim, setShowVerbatim] = useState(false);

  // 1. Where all verified proofs actually went
  const allocation = useMemo(() => {
    const getCount = (id: string) =>
      map.programs.find((p) => p.id === id)?.counts.checked ?? 0;

    const lab = getCount('meta_complexity');
    const library = getCount('library');
    const theory =
      getCount('gct') + getCount('proof_complexity') + getCount('circuit_lower_bounds');
    const alg = getCount('p_eq_np_search');
    const total = Math.max(1, lab + library + theory + alg);

    const pct = (n: number) => ((n / total) * 100).toFixed(1);

    return {
      total,
      buckets: [
        {
          id: 'meta_complexity',
          label: 'Tiny Circuit Lab Tables',
          count: lab,
          pct: pct(lab),
          widthPct: (lab / total) * 100,
          barClass: 'bg-sky-400',
          dotClass: 'bg-sky-400',
          note: 'Individual 6–8 node graph circuit sizes verified in Lean to hunt for patterns.',
        },
        {
          id: 'library',
          label: 'Textbook Math Foundations',
          count: library,
          pct: pct(library),
          widthPct: (library / total) * 100,
          barClass: 'bg-emerald-400',
          dotClass: 'bg-emerald-400',
          note: 'Known classical results (Cook-Levin, Ladner) formalized as building blocks.',
        },
        {
          id: 'gct',
          label: 'Direct P ≠ NP Theory Fronts',
          count: theory,
          pct: pct(theory),
          widthPct: (theory / total) * 100,
          barClass: 'bg-indigo-400',
          dotClass: 'bg-indigo-400',
          note: 'Combined results across Geometric Complexity, Proof Complexity & Circuit Bounds.',
        },
        {
          id: 'p_eq_np_search',
          label: 'P = NP Fast Algorithm Search',
          count: alg,
          pct: pct(alg),
          widthPct: (alg / total) * 100,
          barClass: 'bg-teal-400',
          dotClass: 'bg-teal-400',
          note: '0 surviving fast SAT algorithms so far (all candidates failed testing).',
        },
      ],
    };
  }, [map.programs]);

  // 2. Last 60 Minutes Live Activity Translator
  const lastHour = useMemo(() => {
    const runs = live.checker_runs;
    let labRuns = 0;
    let theoryRuns = 0;
    let libRuns = 0;
    let refutes = 0;
    let accepted = 0;
    let rejected = 0;

    for (const r of runs) {
      if (r.accepted) accepted += 1;
      else rejected += 1;
      if (r.kind === 'refute') {
        refutes += 1;
        continue;
      }
      const key = parseLemmaId(r.lemma_id)?.key;
      if (key === 'meta') labRuns += 1;
      else if (key === 'lib') libRuns += 1;
      else theoryRuns += 1;
    }

    const total = Math.max(1, runs.length);
    const categories = [
      {
        label: 'Small-circuit lab proofs',
        count: labRuns,
        pct: Math.round((labRuns / total) * 100),
        color: 'bg-sky-400',
      },
      {
        label: 'Direct theory fronts (GCT / Proof / Circuit)',
        count: theoryRuns,
        pct: Math.round((theoryRuns / total) * 100),
        color: 'bg-indigo-400',
      },
      {
        label: 'Counterexamples & refutations',
        count: refutes,
        pct: Math.round((refutes / total) * 100),
        color: 'bg-rose-400',
      },
      {
        label: 'Core library building blocks',
        count: libRuns,
        pct: Math.round((libRuns / total) * 100),
        color: 'bg-emerald-400',
      },
    ];

    // 12 five-minute pulse buckets
    const endMs = Date.parse(live.at) || Date.now();
    const numBuckets = 12;
    const stepMs = 5 * 60_000;
    const startMs = endMs - numBuckets * stepMs;
    const pulse = Array.from({ length: numBuckets }, (_, i) => {
      const bStart = new Date(startMs + i * stepMs);
      return {
        startLabel: bStart.toISOString().slice(11, 16) + ' UTC',
        accepted: 0,
        rejected: 0,
        total: 0,
      };
    });
    for (const r of runs) {
      const t = Date.parse(r.at);
      if (Number.isNaN(t)) continue;
      const idx = Math.min(numBuckets - 1, Math.max(0, Math.floor((t - startMs) / stepMs)));
      if (r.accepted) pulse[idx].accepted += 1;
      else pulse[idx].rejected += 1;
      pulse[idx].total += 1;
    }
    const maxPulse = Math.max(1, ...pulse.map((p) => p.total));

    // Auto-translated plain-English sentence for the last hour
    const dominant = [...categories].sort((a, b) => b.count - a.count)[0];
    const translation =
      runs.length === 0
        ? 'The Lean checker was quiet during the last 60 minutes.'
        : `Over the last hour, ${fmtNumber(
            runs.length
          )} proofs hit the Lean 4 checker (${Math.round(
            (accepted / total) * 100
          )}% accepted). ${dominant.pct}% of that wave was ${dominant.label.toLowerCase()}${
            theoryRuns > 0 ? `, with ${fmtNumber(theoryRuns)} checks on direct theory fronts` : ''
          }${refutes > 0 ? ` and ${fmtNumber(refutes)} refutations` : ''}.`;

    return {
      totalRuns: runs.length,
      accepted,
      rejected,
      categories,
      pulse,
      maxPulse,
      translation,
    };
  }, [live.at, live.checker_runs]);

  const activePulse = hoveredBucket !== null ? lastHour.pulse[hoveredBucket] : null;
  const justInLemma = useMemo(() => {
    const m = /#(L-[a-z0-9]+-[0-9]{3,})/.exec(head.just_in?.href ?? '');
    return m ? m[1] : null;
  }, [head.just_in]);

  return (
    <section id="reality-check" className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT 7 COLS: Where All 7,000+ Verified Proofs Actually Went */}
      <div className="lg:col-span-7 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-400">
              <PieChart className="h-3.5 w-3.5" />
              Reality Check · Proof Breakdown
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {fmtNumber(allocation.total)} total verified
            </span>
          </div>

          <h2 className="mt-1.5 font-[var(--font-display)] text-xl sm:text-2xl font-bold text-white">
            Where All {fmtNumber(allocation.total)} Verified Proofs Actually Went
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
            A big counter can look like the fleet is nearly done. This proportional view reveals the actual split between small lab tables, textbook foundations, and direct P vs NP theory.
          </p>

          {/* Proportional Visual Strip */}
          <div className="mt-5">
            <div className="flex h-7 w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800 p-1 gap-1">
              {allocation.buckets.map((b) =>
                b.count > 0 ? (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectProgram(b.id)}
                    style={{ width: `${Math.max(2.5, b.widthPct)}%` }}
                    title={`${b.label}: ${fmtNumber(b.count)} (${b.pct}%)`}
                    className={`${b.barClass} rounded-lg transition-opacity hover:opacity-85 cursor-pointer`}
                  />
                ) : null
              )}
            </div>
          </div>

          {/* 4 Breakdown Cards */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allocation.buckets.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectProgram(b.id)}
                className="group rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/55 hover:border-slate-600 p-3.5 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-100">
                    <span className={`h-2.5 w-2.5 rounded-full ${b.dotClass}`} />
                    {b.label}
                  </span>
                  <span className="font-mono text-xs font-semibold text-white tabular-nums">
                    {b.pct}%
                  </span>
                </div>
                <div className="mt-1.5 font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {fmtNumber(b.count)}{' '}
                  <span className="text-[11px] font-normal text-slate-400">proofs</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{b.note}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Latest Highlight Strip */}
        {head.just_in?.text && (
          <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/8 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-slate-200 leading-relaxed">
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300 font-semibold mr-2">
                Newest Highlight · {fmtRelativeTime(head.just_in.at, nowMs)}
              </span>
              {head.just_in.text}
            </div>
            {justInLemma && (
              <button
                type="button"
                onClick={() => onSelectLemma(justInLemma)}
                className="shrink-0 inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer"
              >
                {justInLemma}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* RIGHT 5 COLS: Last 60 Minutes Plain-English Activity Translator */}
      <div className="lg:col-span-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-sky-400">
              <Radio className="h-3.5 w-3.5" />
              Last 60 Minutes · Translated
            </div>
            <span className="font-mono text-xs text-emerald-300 tabular-nums">
              {fmtNumber(lastHour.totalRuns)} runs
            </span>
          </div>

          <h2 className="mt-1.5 font-[var(--font-display)] text-xl sm:text-2xl font-bold text-white">
            What Agents Actually Did This Hour
          </h2>

          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
            {lastHour.translation}
          </p>

          {/* Category Horizontal Bars */}
          <div className="mt-4 space-y-2.5">
            {lastHour.categories.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">{cat.label}</span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {fmtNumber(cat.count)} ({cat.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.color} transition-all duration-500`}
                    style={{ width: `${cat.count > 0 ? Math.max(2, cat.pct) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 60-Min Verification Pulse Chart */}
          <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                5-Minute Lean Pulse
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {activePulse ? (
                  <>
                    <span className="text-white">{activePulse.startLabel}</span> ·{' '}
                    <span className="text-emerald-300">{activePulse.accepted} ok</span>
                    {activePulse.rejected > 0 ? (
                      <span className="text-rose-400"> · {activePulse.rejected} rej</span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="text-emerald-300">{fmtNumber(lastHour.accepted)} ok</span>
                    {lastHour.rejected > 0 ? (
                      <span className="text-rose-400"> · {fmtNumber(lastHour.rejected)} rej</span>
                    ) : null}
                  </>
                )}
              </span>
            </div>

            <div
              className="flex items-end gap-1.5 h-20 rounded-xl bg-slate-950/70 border border-slate-800/90 px-2 pt-2 pb-1.5"
              onMouseLeave={() => setHoveredBucket(null)}
            >
              {lastHour.pulse.map((b, idx) => {
                const hPct =
                  b.total > 0 ? Math.max(10, Math.round((b.total / lastHour.maxPulse) * 100)) : 5;
                const accShare = b.total > 0 ? Math.round((b.accepted / b.total) * 100) : 100;
                const active = hoveredBucket === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onMouseEnter={() => setHoveredBucket(idx)}
                    onFocus={() => setHoveredBucket(idx)}
                    onClick={onOpenChecker}
                    aria-label={`${b.startLabel}: ${b.accepted} accepted, ${b.rejected} rejected`}
                    className="flex-1 h-full flex flex-col justify-end cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-full rounded-t-sm overflow-hidden flex flex-col justify-end transition-all ${
                        b.total === 0
                          ? 'bg-slate-800'
                          : active
                          ? 'ring-2 ring-sky-400/70'
                          : ''
                      }`}
                      style={{ height: `${hPct}%` }}
                    >
                      {b.rejected > 0 && (
                        <div className="w-full bg-rose-400" style={{ height: `${100 - accShare}%` }} />
                      )}
                      {b.accepted > 0 && (
                        <div
                          className={`w-full ${active ? 'bg-emerald-300' : 'bg-emerald-400/85'}`}
                          style={{ height: `${accShare}%` }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>-60m</span>
              <button
                type="button"
                onClick={onOpenChecker}
                className="text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                Open full checker log →
              </button>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Tucked-away Verbatim Technical Briefing Toggle */}
        {head.status?.text && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => setShowVerbatim((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            >
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Read verbatim technical update from pequalnp.com
              </span>
              {showVerbatim ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showVerbatim && (
              <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs leading-relaxed text-slate-300 space-y-2">
                <p>
                  <LinkedText
                    text={head.status.text}
                    map={map}
                    onSelectLemma={onSelectLemma}
                  />
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <button
                    type="button"
                    onClick={() => onSelectSeat(head.status!.seat)}
                    className="hover:text-sky-300 underline decoration-slate-700 cursor-pointer"
                  >
                    Written by {head.status.seat}
                  </button>
                  <span>Updated {fmtRelativeTime(head.status.at, nowMs)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
