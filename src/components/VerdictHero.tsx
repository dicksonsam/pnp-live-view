import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  HelpCircle,
  Lock,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { statusOfLemma } from '../api/pnpClient';
import type { HeadData, IncidentData, LiveData, OverviewMap } from '../types/pnp';
import { fmtNumber, fmtUtcTime } from '../utils/format';

interface VerdictHeroProps {
  head: HeadData;
  live: LiveData;
  map: OverviewMap;
  incident: IncidentData | null;
  onOpenChecker: () => void;
}

export const VerdictHero: React.FC<VerdictHeroProps> = ({
  head,
  live,
  map,
  incident,
  onOpenChecker,
}) => {
  const [primerOpen, setPrimerOpen] = useState(false);

  const summary = useMemo(() => {
    const totalChecked = head.counters.checked || 0;
    const metaChecked = map.programs.find((p) => p.id === 'meta_complexity')?.counts.checked ?? 0;
    const libChecked = map.programs.find((p) => p.id === 'library')?.counts.checked ?? 0;
    const baseCampShare =
      totalChecked > 0 ? Math.round(((metaChecked + libChecked) / totalChecked) * 100) : 0;

    const agentsTotal =
      head.agents_now_total ??
      (head.agents_now_fleet ?? head.counters.agents_working_now) +
        (head.agents_now_public ?? 0);
    const agentsFleet = head.agents_now_fleet ?? head.counters.agents_working_now ?? 0;
    const agentsPublic = head.agents_now_public ?? Math.max(0, agentsTotal - agentsFleet);

    const linearBroken = statusOfLemma(map, 'L-clb-036') === 'checked';
    const restrictedLawChecked = statusOfLemma(map, 'L-meta-1629') === 'checked';
    const pEqNpChecked = statusOfLemma(map, 'L-alg-001') === 'checked';

    let headline = 'High agent speed — still at Base Camp on P\u00A0vs\u00A0NP.';
    let subline = `${fmtNumber(
      agentsTotal
    )} AI agents are verifying ~${fmtNumber(
      live.checker_runs.length
    )} Lean proofs per hour, yet ${baseCampShare}% of all ${fmtNumber(
      totalChecked
    )} checked results so far are tiny circuit lab tables and textbook foundations. Neither the 50-year barriers to P ≠ NP nor a fast P = NP shortcut has been cracked.`;

    if (head.breakthrough) {
      headline = 'Official breakthrough released — verification ladder active.';
      subline = head.breakthrough.claim_plain;
    } else if (pEqNpChecked) {
      headline = 'A P = NP candidate target has flipped to checked.';
      subline = 'Inspect L-alg-001 immediately for details and verification status.';
    } else if (linearBroken) {
      headline = 'Historic barrier alert: linear circuit lower bound (L-clb-036) marked checked.';
      subline =
        'Super-polynomial lower bounds and independent human review are still required for full P ≠ NP.';
    } else if (restrictedLawChecked) {
      headline = 'Stage 2 reached: a restricted circuit law passed, unrestricted barriers remain.';
      subline =
        'The fleet has moved past pure small-case tables, but unrestricted circuits with NOT gates remain unbroken.';
    }

    return {
      headline,
      subline,
      agentsTotal,
      agentsFleet,
      agentsPublic,
      baseCampShare,
    };
  }, [head, live.checker_runs.length, map]);

  return (
    <section id="verdict" className="scroll-mt-28 space-y-4">
      {/* Official Breakthrough Alert if ever non-null */}
      {head.breakthrough && (
        <div className="rounded-2xl border border-emerald-400/50 bg-emerald-500/15 p-5 shadow-[0_0_40px_rgba(52,211,153,0.18)]">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-300">
            <Sparkles className="h-4 w-4" />
            <span>Breakthrough Released · {head.breakthrough.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="mt-2 font-[var(--font-display)] text-xl font-semibold text-white">
            {head.breakthrough.claim_plain}
          </p>
        </div>
      )}

      {/* Incident notice if active */}
      {incident && incident.state !== 'resolved' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold text-amber-100">
              {incident.label ?? 'Verification checks slowed'}
            </strong>
            {incident.message ? ` — ${incident.message}` : ''}
          </div>
          <span className="font-mono text-amber-300/80 whitespace-nowrap">
            since {fmtUtcTime(incident.since)}
          </span>
        </div>
      )}

      {/* Main Blueprint Verdict Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-bright)]/70 bg-gradient-to-br from-[#0F182B] via-[#0D1424] to-[#0A101D] p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
        {/* Subtle luminous top glow */}
        <div className="pointer-events-none absolute -top-24 right-12 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/35 px-2.5 py-0.5 text-amber-300 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-signal" />
                Stage 1 of 5 · Base Camp
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">Live plain-English synthesis</span>
            </div>

            <h2 className="mt-3 font-[var(--font-display)] text-2xl sm:text-3xl lg:text-[2.15rem] font-bold tracking-tight text-white leading-[1.16]">
              {summary.headline}
            </h2>

            <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-slate-300">
              {summary.subline}
            </p>
          </div>

          {/* 30-Second Visual Guide Toggle */}
          <button
            type="button"
            onClick={() => setPrimerOpen((v) => !v)}
            aria-expanded={primerOpen}
            className={`self-start shrink-0 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              primerOpen
                ? 'border-sky-400 bg-sky-500/20 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                : 'border-[var(--color-border-bright)] bg-slate-900/80 text-slate-200 hover:border-sky-400/60 hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4 text-sky-400" />
            <span>New to P vs NP? (3-step visual guide)</span>
            {primerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Collapsible 3-Step Visual Primer */}
        {primerOpen && (
          <div className="relative mt-6 pt-6 border-t border-[var(--color-border-subtle)] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-indigo-400/25 bg-indigo-950/25 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <BookOpen className="h-4 w-4" />
                Step 1 · Easy to Check vs. Easy to Solve
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Imagine a massive Sudoku puzzle. If someone hands you a completed board, a computer can{' '}
                <strong className="text-white">verify it in milliseconds (NP)</strong>. Actually{' '}
                <strong className="text-white">finding</strong> the answer seems to require slow trial-and-error.{' '}
                <strong className="text-teal-300">P = NP</strong> means a hidden fast shortcut exists for every such puzzle;{' '}
                <strong className="text-indigo-300">P ≠ NP</strong> means no fast shortcut can ever exist.
              </p>
            </div>

            <div className="rounded-xl border border-sky-400/25 bg-sky-950/25 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                <Cpu className="h-4 w-4" />
                Step 2 · Why Agents Test Tiny Logic Circuits
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Every computer algorithm can be translated into wires and logic gates (AND, OR, NOT). Proving a hard problem requires an impossibly giant circuit proves{' '}
                <strong className="text-white">P ≠ NP</strong>. Today, agents are measuring exact smallest circuits for tiny 6–8 node graphs—building a lab table to hunt for patterns.
              </p>
            </div>

            <div className="rounded-xl border border-amber-400/25 bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <Lock className="h-4 w-4" />
                Step 3 · Why Thousands of Proofs ≠ Close
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Every tiny graph in that table is machine-verified in <strong className="text-white">Lean 4</strong> (a strict math proof checker), pushing the count past 7,000. That’s solid lab data—not a universal law. Mathematicians haven’t yet broken even the{' '}
                <strong className="text-amber-200">n^1.01 linear gate barrier</strong> in 50+ years.
              </p>
            </div>
          </div>
        )}

        {/* 4 Live Instrument Gauges */}
        <div className="relative mt-6 pt-5 border-t border-[var(--color-border-subtle)] grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Gauge 1: Active Swarm */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/55 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Users className="h-3.5 w-3.5 text-sky-400" />
                Agents Online Now
              </span>
              <span className="font-mono text-sky-300">LIVE</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {fmtNumber(summary.agentsTotal)}
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {fmtNumber(summary.agentsFleet)} core · {fmtNumber(summary.agentsPublic)} outside
              </span>
            </div>
          </div>

          {/* Gauge 2: Verified Total */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/55 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Verified in Lean 4
              </span>
              <span className="font-mono text-emerald-400 tabular-nums">
                +{fmtNumber(head.counters.checked_last_hour)}/hr
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {fmtNumber(head.counters.checked)}
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {summary.baseCampShare}% lab &amp; library
              </span>
            </div>
          </div>

          {/* Gauge 3: Dead Ends Killed */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/55 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                Refuted / Disproved
              </span>
              <span className="font-mono text-rose-300">RED TEAM</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {fmtNumber(head.counters.refuted)}
              </span>
              <span className="text-[11px] text-slate-400">
                dead leads eliminated
              </span>
            </div>
          </div>

          {/* Gauge 4: Active Fronts & Throughput */}
          <button
            type="button"
            onClick={onOpenChecker}
            className="group rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/55 hover:border-sky-400/50 p-3.5 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                Open Conjectures
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-sky-300 group-hover:underline">
                <Zap className="h-3 w-3" />
                Log →
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {fmtNumber(head.counters.conjecture)}
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {fmtNumber(head.counters.in_work)} in work now
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
