import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Cpu,
  GitPullRequest,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { LEMMA_ID_RE } from '../api/pnpClient';
import type { HeadData, LiveData, LiveSeat } from '../types/pnp';
import {
  fmtNumber,
  fmtRelativeTime,
  humanizeSeat,
  seatActivitySummary,
} from '../utils/format';

interface FleetPulsePanelProps {
  head: HeadData;
  live: LiveData;
  nowMs: number;
  onSelectSeat: (seatId: string) => void;
  onSelectLemma: (lemmaId: string) => void;
  onOpenMessages: () => void;
  onOpenChecker: () => void;
}

const TEAM_ORDER = [
  'Verification & Red Team',
  'Research Programs',
  'Coordination & Ops',
  'Specialists',
] as const;

export const FleetPulsePanel: React.FC<FleetPulsePanelProps> = ({
  head,
  live,
  nowMs,
  onSelectSeat,
  onSelectLemma,
  onOpenMessages,
  onOpenChecker,
}) => {
  const [showIdle, setShowIdle] = useState(false);

  // Compute message volume per seat in the last hour
  const { seatTraffic, maxTraffic, activeSeatsCount } = useMemo(() => {
    const traffic = new Map<string, number>();
    for (const edge of live.edges) {
      const count = edge.at.length;
      traffic.set(edge.from, (traffic.get(edge.from) ?? 0) + count);
      traffic.set(edge.to, (traffic.get(edge.to) ?? 0) + count);
    }
    let max = 1;
    for (const v of traffic.values()) max = Math.max(max, v);
    const activeCount = live.seats.filter((s) => seatActivitySummary(s).isWorking).length;
    return { seatTraffic: traffic, maxTraffic: max, activeSeatsCount: activeCount };
  }, [live.edges, live.seats]);

  const groupedSeats = useMemo(() => {
    const groups = new Map<string, LiveSeat[]>();
    for (const t of TEAM_ORDER) groups.set(t, []);

    const list = showIdle
      ? live.seats
      : live.seats.filter((s) => seatActivitySummary(s).isWorking);

    const sorted = [...list].sort((a, b) => {
      const wa = seatActivitySummary(a).isWorking ? 1 : 0;
      const wb = seatActivitySummary(b).isWorking ? 1 : 0;
      if (wb !== wa) return wb - wa;
      const ta = seatTraffic.get(a.id) ?? 0;
      const tb = seatTraffic.get(b.id) ?? 0;
      if (tb !== ta) return tb - ta;
      return a.id.localeCompare(b.id);
    });

    for (const s of sorted) {
      const info = humanizeSeat(s.id);
      groups.get(info.team)?.push(s);
    }

    return TEAM_ORDER.map((team) => ({
      team,
      seats: groups.get(team) ?? [],
    })).filter((g) => g.seats.length > 0);
  }, [live.seats, showIdle, seatTraffic]);

  const acceptedCount = live.checker_runs.filter((r) => r.accepted).length;
  const passRate =
    live.checker_runs.length > 0
      ? Math.round((acceptedCount / live.checker_runs.length) * 100)
      : 100;

  return (
    <section id="fleet" className="scroll-mt-28 space-y-5">
      {/* Main Simplified Fleet Roster Card */}
      <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(24,24,27,0.03)]">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--color-hairline)]">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              <Cpu className="h-3.5 w-3.5 text-stone-400" />
              Who Is Working Right Now
            </div>
            <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--color-ink)]">
              Core Fleet Orchestrators
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              <strong className="font-semibold text-stone-800 tabular-nums">
                {activeSeatsCount} of {live.seats.length}
              </strong>{' '}
              seats active in the last hour ·{' '}
              <span className="tabular-nums">{fmtNumber(live.messages_today ?? 0)}</span> messages today
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setShowIdle(false)}
              className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                !showIdle
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Active ({activeSeatsCount})
            </button>
            <button
              type="button"
              onClick={() => setShowIdle(true)}
              className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                showIdle
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              All ({live.seats.length})
            </button>
          </div>
        </div>

        {/* Grouped Human-Readable Team Rows */}
        <div className="mt-4 space-y-5">
          {groupedSeats.length === 0 ? (
            <p className="text-sm text-stone-500 py-4 text-center">
              All core orchestrators are currently quiet. Toggle “All” to inspect the full roster.
            </p>
          ) : (
            groupedSeats.map(({ team, seats }) => (
              <div key={team}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                  {team}
                </h4>
                <div className="space-y-1.5">
                  {seats.map((seat) => {
                    const human = humanizeSeat(seat.id);
                    const act = seatActivitySummary(seat);
                    const traffic = seatTraffic.get(seat.id) ?? 0;
                    const barPct = traffic > 0 ? Math.max(8, Math.round((traffic / maxTraffic) * 100)) : 0;
                    const targetIsLemma = act.target && LEMMA_ID_RE.test(act.target);

                    return (
                      <div
                        key={seat.id}
                        onClick={() => onSelectSeat(seat.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectSeat(seat.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`group flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all cursor-pointer ${
                          act.isWorking
                            ? 'border-[var(--color-hairline)] bg-[var(--color-paper)]/55 hover:bg-[var(--color-paper)] hover:border-stone-300'
                            : 'border-transparent bg-stone-50/50 hover:bg-stone-100/70 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                act.isWorking ? 'bg-emerald-500 animate-live-dot' : 'bg-stone-300'
                              }`}
                            />
                            <span className="text-sm font-medium text-stone-900 truncate">
                              {human.name}
                            </span>
                            <span className="hidden sm:inline font-mono text-[11px] text-stone-400">
                              {seat.id}
                            </span>
                          </div>

                          <div className="mt-0.5 pl-4 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-600">
                            {targetIsLemma && act.target ? (
                              <span>
                                {act.verb}{' '}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectLemma(act.target!);
                                  }}
                                  className="font-mono text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.2 hover:bg-emerald-100 cursor-pointer"
                                >
                                  {act.target}
                                </button>
                              </span>
                            ) : (
                              <span className={act.isWorking ? 'text-stone-700' : 'text-stone-400'}>
                                {act.label}
                              </span>
                            )}
                            {act.since && (
                              <span className="text-[11px] text-stone-400 tabular-nums">
                                · {fmtRelativeTime(act.since, nowMs)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Traffic heat indicator */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {traffic > 0 && (
                            <div className="hidden sm:flex flex-col items-end w-16" title={`${traffic} messages/pings in last hour`}>
                              <span className="font-mono text-[10px] text-stone-400 tabular-nums">
                                {traffic} msgs
                              </span>
                              <div className="mt-0.5 h-1 w-full rounded-full bg-stone-200 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-stone-600"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-700 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Progressive Disclosure Deep-Dive Launchers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={onOpenMessages}
          className="group rounded-2xl border border-[var(--color-hairline)] bg-white p-4 text-left hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700 group-hover:bg-stone-900 group-hover:text-white transition-colors">
              <MessageSquare className="h-4 w-4" />
            </span>
            <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-stone-800 transition-colors" />
          </div>
          <h4 className="mt-3 font-serif text-base font-semibold text-stone-900">
            Inside the Hub: Agent Chatter
          </h4>
          <p className="mt-1 text-xs text-stone-500 leading-relaxed tabular-nums">
            <strong className="font-medium text-stone-700">{fmtNumber(live.messages.length)}</strong> cleared messages in the last hour
            {live.not_shown_last_hour ? ` · ${fmtNumber(live.not_shown_last_hour)} held back` : ''}
          </p>
        </button>

        <button
          type="button"
          onClick={onOpenChecker}
          className="group rounded-2xl border border-[var(--color-hairline)] bg-white p-4 text-left hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-stone-800 transition-colors" />
          </div>
          <h4 className="mt-3 font-serif text-base font-semibold text-stone-900">
            Lean 4 Checker Runs
          </h4>
          <p className="mt-1 text-xs text-stone-500 leading-relaxed tabular-nums">
            <strong className="font-medium text-emerald-700">{fmtNumber(live.checker_runs.length)}</strong> runs in the last hour ({passRate}% accepted)
          </p>
        </button>
      </div>

      {/* Outside Contributor Activity Card */}
      {head.outside && (
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper-warm)]/65 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
              <GitPullRequest className="h-4 w-4 text-emerald-700" />
              Outside Contributor Swarm
            </div>
            <span className="font-mono text-xs text-stone-500 tabular-nums">
              {fmtNumber(head.outside.count)} contributors · {fmtNumber(head.outside.steps)} verified steps
            </span>
          </div>

          {head.outside.newest && (
            <p className="mt-2 text-xs leading-relaxed text-stone-600">
              Latest verified submission from{' '}
              <a
                href={`https://github.com/${head.outside.newest.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-medium text-stone-900 underline decoration-stone-300 underline-offset-2 hover:text-black"
              >
                @{head.outside.newest.github}
              </a>{' '}
              on{' '}
              <button
                type="button"
                onClick={() => onSelectLemma(head.outside!.newest!.lemma_id)}
                className="font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 hover:bg-emerald-100 cursor-pointer"
              >
                {head.outside.newest.lemma_id}
              </button>{' '}
              <span className="text-stone-400">
                ({fmtRelativeTime(head.outside.newest.at, nowMs)})
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
};
