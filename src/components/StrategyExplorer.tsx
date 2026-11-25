import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Layers,
  Link2,
  PauseCircle,
  Search,
  Target,
  Zap,
} from 'lucide-react';
import { statusOfLemma } from '../api/pnpClient';
import type {
  AttackStatus,
  LiveData,
  OverviewMap,
  PlanData,
  ProgramAim,
} from '../types/pnp';
import {
  AIM_LABELS,
  ATTACK_STATUS_STYLES,
  STATUS_STYLES,
  fmtNumber,
  programMeta,
  seatActivitySummary,
} from '../utils/format';
import { LinkedText } from './LinkedText';

interface StrategyExplorerProps {
  map: OverviewMap;
  plan: PlanData | null;
  live: LiveData;
  onSelectProgram: (programId: string) => void;
  onSelectLemma: (lemmaId: string) => void;
}

type AttackFilter = AttackStatus | 'all';
type AimFilter = 'all' | ProgramAim;

const ATTACK_TABS: AttackFilter[] = ['live', 'support', 'stopped', 'dormant', 'all'];

export const StrategyExplorer: React.FC<StrategyExplorerProps> = ({
  map,
  plan,
  live,
  onSelectProgram,
  onSelectLemma,
}) => {
  const [aimFilter, setAimFilter] = useState<AimFilter>('all');
  const [attackFilter, setAttackFilter] = useState<AttackFilter>('live');
  const [query, setQuery] = useState('');

  // ---- 6 Research Fronts metadata ----
  const programStats = useMemo(() => {
    const stats = new Map<
      string,
      { workingSeats: number; liveAttackCount: number; totalAttackCount: number }
    >();
    for (const p of map.programs) {
      const workingSeats = live.seats
        .filter((s) => s.program === p.id)
        .filter((s) => seatActivitySummary(s).isWorking).length;
      const attacks = map.attack.filter((a) => a.program === p.id);
      const liveAttackCount = attacks.filter((a) => a.status === 'live').length;
      stats.set(p.id, { workingSeats, liveAttackCount, totalAttackCount: attacks.length });
    }
    return stats;
  }, [map, live.seats]);

  const sortedPrograms = useMemo(() => {
    const list =
      aimFilter === 'all'
        ? [...map.programs]
        : map.programs.filter((p) => p.aims_at === aimFilter);
    return list.sort((a, b) => {
      const sa = programStats.get(a.id);
      const sb = programStats.get(b.id);
      const scoreA =
        (sa?.liveAttackCount ?? 0) * 100 +
        (sa?.workingSeats ?? 0) * 10 +
        (a.counts.in_work > 0 ? 5 : 0);
      const scoreB =
        (sb?.liveAttackCount ?? 0) * 100 +
        (sb?.workingSeats ?? 0) * 10 +
        (b.counts.in_work > 0 ? 5 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.counts.checked - a.counts.checked;
    });
  }, [map.programs, aimFilter, programStats]);

  // ---- 27 Attack Lines breakdown ----
  const attackCounts = useMemo(() => {
    const c: Record<AttackFilter, number> = {
      live: 0,
      support: 0,
      stopped: 0,
      dormant: 0,
      all: map.attack.length,
    };
    for (const a of map.attack) {
      if (a.status in c) c[a.status] += 1;
    }
    return c;
  }, [map.attack]);

  const filteredAttacks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return map.attack.filter((line) => {
      if (attackFilter !== 'all' && line.status !== attackFilter) return false;
      if (!q) return true;
      return (
        line.title.toLowerCase().includes(q) ||
        line.why.toLowerCase().includes(q) ||
        line.program.toLowerCase().includes(q) ||
        line.rows.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [map.attack, attackFilter, query]);

  const totalAttacks = Math.max(1, attackCounts.all);

  return (
    <section id="strategies" className="scroll-mt-28 space-y-10">
      {/* PART A: THE SIX RESEARCH FRONTS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-indigo-400">
              <Target className="h-3.5 w-3.5" />
              Six Research Fronts
            </div>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-white">
              How Each Front Connects to P vs NP
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Click any card to open its step-by-step proof chain, current bottleneck, and recorded dead ends.
            </p>
          </div>

          <div className="inline-flex items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)] p-1 self-start sm:self-auto">
            {(
              [
                { id: 'all', label: 'All (6)' },
                { id: 'p_neq_np', label: 'P ≠ NP' },
                { id: 'neutral', label: 'Lab & Library' },
                { id: 'p_eq_np', label: 'P = NP' },
              ] as Array<{ id: AimFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAimFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  aimFilter === tab.id
                    ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPrograms.map((prog) => {
            const meta = programMeta(prog.id);
            const progPlan = plan?.programs?.[prog.id];
            const stats = programStats.get(prog.id);
            const aim = AIM_LABELS[prog.aims_at];

            const isPrimary = (stats?.liveAttackCount ?? 0) > 0;
            const workingSeats = stats?.workingSeats ?? 0;
            const hasInWork = prog.counts.in_work > 0;
            const targetChecked = progPlan?.target?.status === 'checked';

            const totalLemmas =
              prog.counts.checked +
              prog.counts.conjecture +
              prog.counts.refuted +
              prog.counts.in_work +
              prog.counts.blocked;
            const checkedPct = totalLemmas > 0 ? (prog.counts.checked / totalLemmas) * 100 : 0;
            const openPct = totalLemmas > 0 ? (prog.counts.conjecture / totalLemmas) * 100 : 0;
            const refutedPct = totalLemmas > 0 ? (prog.counts.refuted / totalLemmas) * 100 : 0;

            const chainTotal = progPlan?.chain?.length ?? 0;
            const chainChecked =
              progPlan?.chain?.filter((c) => c.status === 'checked').length ?? 0;

            return (
              <article
                key={prog.id}
                onClick={() => onSelectProgram(prog.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProgram(prog.id);
                  }
                }}
                tabIndex={0}
                role="button"
                className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
                  isPrimary
                    ? 'border-sky-400/45 bg-gradient-to-b from-[#112038] to-[#0D1526] shadow-[0_0_28px_rgba(56,189,248,0.08)] hover:border-sky-300/70'
                    : 'border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${aim.className}`}
                    >
                      {aim.label}
                    </span>

                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-400/35 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-signal" />
                        Main Focus · {stats?.liveAttackCount} live
                      </span>
                    ) : targetChecked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Target Checked
                      </span>
                    ) : workingSeats > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                        <Zap className="h-3 w-3" />
                        {workingSeats} seat{workingSeats === 1 ? '' : 's'} active
                      </span>
                    ) : hasInWork ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                        <Zap className="h-3 w-3" />
                        {prog.counts.in_work} in work
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                        <PauseCircle className="h-3 w-3" />
                        Parked / Quiet
                      </span>
                    )}
                  </div>

                  <div className="mt-3.5 flex items-start gap-2.5">
                    <span
                      className="mt-2 h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <div>
                      <h3 className="font-[var(--font-display)] text-lg font-bold text-white leading-snug">
                        {meta.shortTitle}
                      </h3>
                      <p className="text-xs text-slate-400">{progPlan?.short_name ?? prog.title}</p>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-400 line-clamp-2">
                    {progPlan?.target?.goal ?? prog.goal}
                  </p>

                  {/* Connection to P vs NP Box */}
                  <div className="mt-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                      <Link2 className="h-3 w-3 shrink-0" style={{ color: meta.color }} />
                      <span>Connection to P vs NP</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-200">
                      {meta.pnpBridge}
                    </p>
                  </div>
                </div>

                {/* Bottom ledger */}
                <div className="mt-4 pt-3.5 border-t border-[var(--color-border-subtle)]">
                  <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                    <span className="text-slate-300 font-medium">
                      <span className="text-emerald-300">{fmtNumber(prog.counts.checked)}</span>{' '}
                      <span className="text-slate-500 font-normal">checked</span>
                      {prog.counts.refuted > 0 && (
                        <>
                          {' · '}
                          <span className="text-rose-300">{fmtNumber(prog.counts.refuted)}</span>{' '}
                          <span className="text-slate-500 font-normal">refuted</span>
                        </>
                      )}
                    </span>
                    {chainTotal > 0 && (
                      <span className="font-mono text-[11px] text-slate-400">
                        {chainChecked}/{chainTotal} chain
                      </span>
                    )}
                  </div>

                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                    {checkedPct > 0 && (
                      <div className="bg-emerald-400" style={{ width: `${checkedPct}%` }} />
                    )}
                    {openPct > 0 && (
                      <div className="bg-slate-600" style={{ width: `${openPct}%` }} />
                    )}
                    {refutedPct > 0 && (
                      <div className="bg-rose-400" style={{ width: `${refutedPct}%` }} />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {stats?.totalAttackCount
                        ? `${stats.totalAttackCount} attack line${stats.totalAttackCount === 1 ? '' : 's'}`
                        : 'Shared foundations'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-sky-300 group-hover:text-sky-200">
                      Bottleneck &amp; chain
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* PART B: ALIVE VS DEAD ENDS (27 ATTACK LINES) */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-amber-400">
              <Flame className="h-3.5 w-3.5" />
              Strategy Survival Radar
            </div>
            <h3 className="mt-1 font-[var(--font-display)] text-xl sm:text-2xl font-bold text-white">
              What’s Alive vs. What Hit a Wall ({attackCounts.all} Strategies)
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              <strong className="text-emerald-300">{attackCounts.live} live</strong> right now ·{' '}
              <strong className="text-sky-300">{attackCounts.support} supporting</strong> ·{' '}
              <strong className="text-rose-300">{attackCounts.stopped} dead ends</strong> stopped by counterexamples or barriers ·{' '}
              <strong className="text-slate-300">{attackCounts.dormant} dormant</strong>.
            </p>
          </div>

          <div className="relative w-full md:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter strategies..."
              aria-label="Filter attack strategies"
              className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/70 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Proportional survival bar */}
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-900 gap-0.5">
          <div
            className="bg-emerald-400"
            style={{ width: `${(attackCounts.live / totalAttacks) * 100}%` }}
            title={`Active: ${attackCounts.live}`}
          />
          <div
            className="bg-sky-400"
            style={{ width: `${(attackCounts.support / totalAttacks) * 100}%` }}
            title={`Supporting: ${attackCounts.support}`}
          />
          <div
            className="bg-rose-400"
            style={{ width: `${(attackCounts.stopped / totalAttacks) * 100}%` }}
            title={`Dead Ends: ${attackCounts.stopped}`}
          />
          <div
            className="bg-slate-600"
            style={{ width: `${(attackCounts.dormant / totalAttacks) * 100}%` }}
            title={`Dormant: ${attackCounts.dormant}`}
          />
        </div>

        {/* Filter pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ATTACK_TABS.map((tab) => {
            const active = attackFilter === tab;
            const style = tab !== 'all' ? ATTACK_STATUS_STYLES[tab] : null;
            const label =
              tab === 'all'
                ? 'All'
                : tab === 'live'
                ? 'Active Right Now'
                : tab === 'support'
                ? 'Supporting'
                : tab === 'stopped'
                ? 'Dead Ends'
                : 'Dormant';
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setAttackFilter(tab)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'border-sky-400/60 bg-sky-500/20 text-white'
                    : 'border-[var(--color-border-subtle)] bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {style && <span className={`h-2 w-2 rounded-full ${style.dot}`} />}
                <span>{label}</span>
                <span className="font-mono text-[11px] opacity-75">{attackCounts[tab]}</span>
              </button>
            );
          })}
        </div>

        {/* Cards */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAttacks.map((line) => {
            const st = ATTACK_STATUS_STYLES[line.status];
            const pMeta = programMeta(line.program);
            return (
              <div
                key={line.id}
                className="flex flex-col justify-between rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/55 p-4 hover:border-slate-600 transition-colors"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${st.pill}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${st.dot} ${
                          line.status === 'live' ? 'animate-signal' : ''
                        }`}
                      />
                      {st.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectProgram(line.program)}
                      className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: pMeta.color }}
                      />
                      {pMeta.shortTitle}
                    </button>
                  </div>

                  <h4 className="font-[var(--font-display)] text-[15px] font-semibold leading-snug text-slate-100">
                    {line.title}
                  </h4>

                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    <LinkedText text={line.why} map={map} onSelectLemma={onSelectLemma} />
                  </p>
                </div>

                {line.rows.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 mr-1">
                      <Layers className="h-3 w-3" />
                      LEMMAS:
                    </span>
                    {line.rows.map((id) => {
                      const lemmaStatus = statusOfLemma(map, id);
                      const dotClass = lemmaStatus
                        ? STATUS_STYLES[lemmaStatus].dot
                        : 'bg-slate-400';
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onSelectLemma(id)}
                          className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 hover:border-sky-400/50 px-2 py-0.5 font-mono text-[11px] text-sky-200 cursor-pointer transition-colors"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                          {id}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
