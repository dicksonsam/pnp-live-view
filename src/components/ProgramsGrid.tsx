import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Link2,
  PauseCircle,
  Zap,
} from 'lucide-react';
import type { LiveData, OverviewMap, PlanData, ProgramAim, ProgramOverview } from '../types/pnp';
import { AIM_LABELS, fmtNumber, programMeta, seatActivitySummary } from '../utils/format';

interface ProgramsGridProps {
  map: OverviewMap;
  plan: PlanData | null;
  live: LiveData;
  onSelectProgram: (programId: string) => void;
}

type AimFilter = 'all' | ProgramAim;

export const ProgramsGrid: React.FC<ProgramsGridProps> = ({
  map,
  plan,
  live,
  onSelectProgram,
}) => {
  const [aimFilter, setAimFilter] = useState<AimFilter>('all');

  const programStats = useMemo(() => {
    const mapStats = new Map<
      string,
      {
        workingSeats: number;
        totalSeats: number;
        liveAttackCount: number;
        totalAttackCount: number;
      }
    >();

    for (const p of map.programs) {
      const seats = live.seats.filter((s) => s.program === p.id);
      const workingSeats = seats.filter((s) => seatActivitySummary(s).isWorking).length;
      const attacks = map.attack.filter((a) => a.program === p.id);
      const liveAttackCount = attacks.filter((a) => a.status === 'live').length;
      mapStats.set(p.id, {
        workingSeats,
        totalSeats: seats.length,
        liveAttackCount,
        totalAttackCount: attacks.length,
      });
    }
    return mapStats;
  }, [map, live.seats]);

  const sortedPrograms = useMemo(() => {
    const list =
      aimFilter === 'all'
        ? [...map.programs]
        : map.programs.filter((p) => p.aims_at === aimFilter);

    // Order: programs with live attack lines first, then active seats, then checked volume
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

  const renderProgramCard = (prog: ProgramOverview) => {
    const meta = programMeta(prog.id);
    const progPlan = plan?.programs?.[prog.id];
    const stats = programStats.get(prog.id);
    const aim = AIM_LABELS[prog.aims_at];

    const totalLemmas =
      prog.counts.checked +
      prog.counts.conjecture +
      prog.counts.refuted +
      prog.counts.in_work +
      prog.counts.blocked;

    const checkedPct = totalLemmas > 0 ? (prog.counts.checked / totalLemmas) * 100 : 0;
    const inWorkPct = totalLemmas > 0 ? (prog.counts.in_work / totalLemmas) * 100 : 0;
    const openPct = totalLemmas > 0 ? (prog.counts.conjecture / totalLemmas) * 100 : 0;
    const refutedPct = totalLemmas > 0 ? (prog.counts.refuted / totalLemmas) * 100 : 0;

    const isPrimaryActive = (stats?.liveAttackCount ?? 0) > 0;
    const workingSeats = stats?.workingSeats ?? 0;
    const hasInWork = prog.counts.in_work > 0;
    const targetChecked = progPlan?.target?.status === 'checked';

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
        className={`group flex flex-col justify-between rounded-2xl border bg-white p-5 sm:p-6 text-left transition-all duration-150 cursor-pointer hover:shadow-md hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 ${
          isPrimaryActive
            ? 'border-amber-300/90 shadow-[0_2px_10px_rgba(180,83,9,0.06)]'
            : 'border-[var(--color-hairline)] shadow-[0_1px_2px_rgba(24,24,27,0.03)]'
        }`}
      >
        <div>
          {/* Top badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${aim.className}`}
            >
              {aim.label}
            </span>

            {isPrimaryActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-live-dot" />
                Main Focus · {stats?.liveAttackCount} live front{stats?.liveAttackCount === 1 ? '' : 's'}
              </span>
            ) : targetChecked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-lime-50 border border-lime-200 px-2.5 py-0.5 text-[11px] font-medium text-lime-800">
                <CheckCircle2 className="h-3 w-3" />
                Target Checked
              </span>
            ) : workingSeats > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                <Zap className="h-3 w-3" />
                {workingSeats} seat{workingSeats === 1 ? '' : 's'} active
              </span>
            ) : hasInWork ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                <Zap className="h-3 w-3" />
                {prog.counts.in_work} lemma in work
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                <PauseCircle className="h-3 w-3" />
                Parked / Quiet
              </span>
            )}
          </div>

          {/* Program Heading */}
          <div className="mt-3.5 flex items-start gap-2.5">
            <span
              className="mt-2 h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: meta.color }}
            />
            <div>
              <h3 className="font-serif text-xl font-semibold leading-snug text-[var(--color-ink)] group-hover:text-black">
                {progPlan?.short_name ?? prog.title}
              </h3>
              {progPlan?.short_name && progPlan.short_name.toLowerCase() !== prog.title.toLowerCase() && (
                <p className="text-xs text-stone-400 mt-0.5">{prog.title}</p>
              )}
            </div>
          </div>

          {/* Specific Program Goal */}
          <p className="mt-2.5 text-sm leading-relaxed text-stone-600 line-clamp-3">
            {progPlan?.target?.goal ?? prog.goal}
          </p>

          {/* How This Connects to P vs NP */}
          <div className="mt-4 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <Link2 className="h-3 w-3 shrink-0" style={{ color: meta.color }} />
              <span>Connection to P vs NP</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-stone-700">
              {meta.pnpBridge}
            </p>
          </div>
        </div>

        {/* Bottom Progress Bar & Footer */}
        <div className="mt-5 pt-4 border-t border-[var(--color-hairline)]/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-stone-700 tabular-nums">
              {fmtNumber(prog.counts.checked)}{' '}
              <span className="font-normal text-stone-500">checked</span>
              {prog.counts.refuted > 0 && (
                <>
                  {' · '}
                  <span className="text-rose-700">{fmtNumber(prog.counts.refuted)}</span>{' '}
                  <span className="font-normal text-stone-500">refuted</span>
                </>
              )}
              {prog.counts.conjecture > 0 && (
                <>
                  {' · '}
                  <span>{fmtNumber(prog.counts.conjecture)}</span>{' '}
                  <span className="font-normal text-stone-500">open</span>
                </>
              )}
            </span>
            {chainTotal > 0 && (
              <span className="font-mono text-[11px] text-stone-500 tabular-nums">
                {chainChecked}/{chainTotal} chain
              </span>
            )}
          </div>

          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
            {checkedPct > 0 && (
              <div className="bg-emerald-600" style={{ width: `${checkedPct}%` }} />
            )}
            {inWorkPct > 0 && (
              <div className="bg-amber-500" style={{ width: `${inWorkPct}%` }} />
            )}
            {openPct > 0 && (
              <div className="bg-slate-300" style={{ width: `${openPct}%` }} />
            )}
            {refutedPct > 0 && (
              <div className="bg-rose-400" style={{ width: `${refutedPct}%` }} />
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-stone-400">
              {stats?.totalAttackCount
                ? `${stats.totalAttackCount} attack line${stats.totalAttackCount === 1 ? '' : 's'}`
                : 'Supporting foundations'}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-stone-700 group-hover:text-black transition-colors">
              Proof chain &amp; details
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section id="fronts" className="scroll-mt-28">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            <Compass className="h-3.5 w-3.5 text-stone-400" />
            The Battle Map
          </div>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            Six Research Fronts
          </h2>
          <p className="mt-1 text-sm text-stone-600 max-w-2xl">
            The fleet splits P vs NP into six distinct programs—some aiming to prove{' '}
            <strong className="font-medium text-stone-800">P ≠ NP</strong>, one searching for a fast{' '}
            <strong className="font-medium text-stone-800">P = NP</strong> algorithm, and two building shared foundations and circuit tables. Click any front to inspect its step-by-step proof chain.
          </p>
        </div>

        {/* Aim Filter Pills */}
        <div className="inline-flex items-center rounded-xl border border-[var(--color-hairline)] bg-white p-1 self-start sm:self-auto">
          {(
            [
              { id: 'all', label: 'All (6)' },
              { id: 'p_neq_np', label: 'P ≠ NP' },
              { id: 'neutral', label: 'Meta & Library' },
              { id: 'p_eq_np', label: 'P = NP' },
            ] as Array<{ id: AimFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAimFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                aimFilter === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedPrograms.map(renderProgramCard)}
      </div>
    </section>
  );
};
