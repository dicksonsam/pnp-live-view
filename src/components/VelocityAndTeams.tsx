import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Cpu,
  GitPullRequest,
  MessageSquare,
  Newspaper,
  ShieldCheck,
} from 'lucide-react';
import { LEMMA_ID_RE } from '../api/pnpClient';
import type {
  CalendarMonthData,
  HeadData,
  LiveData,
  LiveSeat,
  NewsArticleSummary,
  NewsIndex,
} from '../types/pnp';
import {
  fmtNumber,
  fmtRelativeTime,
  humanizeSeat,
  programMeta,
  seatActivitySummary,
} from '../utils/format';

interface VelocityAndTeamsProps {
  head: HeadData;
  live: LiveData;
  calendarMonth: CalendarMonthData | null;
  news: NewsIndex | null;
  nowMs: number;
  onSelectSeat: (seatId: string) => void;
  onSelectLemma: (lemmaId: string) => void;
  onSelectArticle: (article: NewsArticleSummary) => void;
  onOpenMessages: () => void;
  onOpenChecker: () => void;
}

const TEAM_ORDER = [
  'Verification & Red Team',
  'Research Fronts',
  'Coordination & Ops',
  'Specialists',
] as const;

export const VelocityAndTeams: React.FC<VelocityAndTeamsProps> = ({
  head,
  live,
  calendarMonth,
  news,
  nowMs,
  onSelectSeat,
  onSelectLemma,
  onSelectArticle,
  onOpenMessages,
  onOpenChecker,
}) => {
  const [chartMode, setChartMode] = useState<'daily' | 'hourly'>('daily');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showIdle, setShowIdle] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);

  // ---- Campaign Momentum Bars ----
  const { bars, maxTotal } = useMemo(() => {
    if (!calendarMonth?.days) return { bars: [], maxTotal: 1 };
    const [yyyy, mm] = calendarMonth.month.split('-');
    const monthName = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1)).toLocaleDateString(
      'en-US',
      { month: 'short', timeZone: 'UTC' }
    );
    const sortedDays = Object.keys(calendarMonth.days).sort((a, b) => Number(a) - Number(b));

    if (chartMode === 'daily') {
      const list = sortedDays.map((d) => {
        const info = calendarMonth.days[d];
        return {
          key: d,
          label: `${monthName} ${Number(d)}`,
          sublabel: `${fmtNumber(info.total)} events`,
          checked: info.checked,
          refuted: info.refuted,
          total: info.checked + info.refuted,
        };
      });
      return { bars: list, maxTotal: Math.max(1, ...list.map((x) => x.total)) };
    }

    const latestKey = sortedDays[sortedDays.length - 1];
    const latest = calendarMonth.days[latestKey];
    const hourMap = new Map<number, { checked: number; refuted: number }>();
    let maxHour = 0;
    if (latest?.lanes) {
      for (const rows of Object.values(latest.lanes)) {
        for (const [h, checked, refuted] of rows) {
          maxHour = Math.max(maxHour, h);
          const cur = hourMap.get(h) ?? { checked: 0, refuted: 0 };
          cur.checked += checked;
          cur.refuted += refuted;
          hourMap.set(h, cur);
        }
      }
    }
    const list = [];
    for (let h = 0; h <= maxHour; h += 1) {
      const v = hourMap.get(h) ?? { checked: 0, refuted: 0 };
      list.push({
        key: String(h),
        label: `${String(h).padStart(2, '0')}h`,
        sublabel: `${monthName} ${Number(latestKey)} · ${String(h).padStart(2, '0')}:00 UTC`,
        checked: v.checked,
        refuted: v.refuted,
        total: v.checked + v.refuted,
      });
    }
    return { bars: list, maxTotal: Math.max(1, ...list.map((x) => x.total)) };
  }, [calendarMonth, chartMode]);

  const activeBar = hoveredIdx !== null ? bars[hoveredIdx] : bars[bars.length - 1] ?? null;

  // ---- Simplified Active Teams ----
  const { seatTraffic, maxTraffic, activeSeatsCount } = useMemo(() => {
    const traffic = new Map<string, number>();
    for (const edge of live.edges) {
      traffic.set(edge.from, (traffic.get(edge.from) ?? 0) + edge.at.length);
      traffic.set(edge.to, (traffic.get(edge.to) ?? 0) + edge.at.length);
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
      groups.get(humanizeSeat(s.id).team)?.push(s);
    }
    return TEAM_ORDER.map((team) => ({
      team,
      seats: groups.get(team) ?? [],
    })).filter((g) => g.seats.length > 0);
  }, [live.seats, showIdle, seatTraffic]);

  const articles = news?.articles ?? [];
  const visibleArticles = showAllNews ? articles.slice(0, 12) : articles.slice(0, 4);

  return (
    <section id="pulse" className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT 7 COLS: Campaign Momentum + Dispatches */}
      <div className="lg:col-span-7 space-y-6">
        {/* Campaign Momentum Surge */}
        {bars.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-400">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Campaign Velocity
                </div>
                <h3 className="mt-1 font-[var(--font-display)] text-xl font-bold text-white">
                  Verified vs. Refuted Surge
                </h3>
              </div>

              <div className="inline-flex rounded-lg border border-[var(--color-border-subtle)] bg-slate-950/70 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setChartMode('daily');
                    setHoveredIdx(null);
                  }}
                  className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                    chartMode === 'daily'
                      ? 'bg-sky-500/20 text-sky-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  By Day
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChartMode('hourly');
                    setHoveredIdx(null);
                  }}
                  className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                    chartMode === 'hourly'
                      ? 'bg-sky-500/20 text-sky-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Today Hourly
                </button>
              </div>
            </div>

            {activeBar && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/70 border border-slate-800 px-3.5 py-2 text-xs">
                <span className="font-medium text-slate-200">
                  {chartMode === 'hourly'
                    ? activeBar.sublabel
                    : `${activeBar.label} (${activeBar.sublabel})`}
                </span>
                <div className="flex items-center gap-4 font-mono tabular-nums">
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {fmtNumber(activeBar.checked)} checked
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-rose-300">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    {fmtNumber(activeBar.refuted)} refuted
                  </span>
                </div>
              </div>
            )}

            <div
              className="flex items-end gap-2 h-36 pt-3 pb-1 px-1"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {bars.map((b, idx) => {
                const hPct =
                  b.total > 0 ? Math.max(6, Math.round((b.total / maxTotal) * 100)) : 2;
                const checkedShare = b.total > 0 ? (b.checked / b.total) * 100 : 100;
                const selected =
                  hoveredIdx === idx || (hoveredIdx === null && idx === bars.length - 1);
                return (
                  <div
                    key={b.key}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 cursor-pointer group"
                  >
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-full max-w-14 rounded-t-md overflow-hidden flex flex-col justify-end transition-all ${
                          selected
                            ? 'ring-2 ring-sky-400/60'
                            : 'opacity-80 group-hover:opacity-100'
                        }`}
                        style={{ height: `${hPct}%` }}
                      >
                        {b.refuted > 0 && (
                          <div
                            className="w-full bg-rose-400/90"
                            style={{ height: `${100 - checkedShare}%` }}
                          />
                        )}
                        {b.checked > 0 && (
                          <div
                            className="w-full bg-emerald-400"
                            style={{ height: `${checkedShare}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] tabular-nums whitespace-nowrap ${
                        selected ? 'text-white font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {chartMode === 'hourly'
                        ? idx % 3 === 0 || idx === bars.length - 1
                          ? b.label
                          : ''
                        : b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fleet Dispatches */}
        {articles.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--color-border-subtle)]">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-purple-300">
                  <Newspaper className="h-3.5 w-3.5" />
                  Fleet Dispatches
                </div>
                <h3 className="mt-1 font-[var(--font-display)] text-xl font-bold text-white">
                  Milestone Reports &amp; Outside Audits
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-400">{articles.length} reports</span>
            </div>

            <div className="divide-y divide-[var(--color-border-subtle)]/70">
              {visibleArticles.map((art) => {
                const pMeta = programMeta(art.program);
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => onSelectArticle(art)}
                    className="group w-full py-3.5 text-left flex flex-col gap-1 hover:bg-slate-900/60 -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: pMeta.color }}
                        />
                        {pMeta.shortTitle}
                      </span>
                      <span className="font-mono text-slate-500">
                        {fmtRelativeTime(art.published_at, nowMs)}
                      </span>
                    </div>
                    <h4 className="font-[var(--font-display)] text-[15px] font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
                      {art.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{art.dek}</p>
                  </button>
                );
              })}
            </div>

            {articles.length > 4 && (
              <div className="pt-3 border-t border-[var(--color-border-subtle)]/70">
                <button
                  type="button"
                  onClick={() => setShowAllNews((v) => !v)}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  {showAllNews
                    ? 'Show fewer dispatches'
                    : `Show more dispatches (${articles.length} total)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT 5 COLS: Human-Readable Active Teams + Deep-Dive Launchers */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--color-border-subtle)]">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-sky-400">
                <Cpu className="h-3.5 w-3.5" />
                Live Orchestrator Roster
              </div>
              <h3 className="mt-1 font-[var(--font-display)] text-xl font-bold text-white">
                Who Is Working Now
              </h3>
              <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                <strong className="text-white">
                  {activeSeatsCount} of {live.seats.length}
                </strong>{' '}
                active in last hour · {fmtNumber(live.messages_today ?? 0)} msgs today
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-[var(--color-border-subtle)] bg-slate-950/70 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setShowIdle(false)}
                className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                  !showIdle ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active ({activeSeatsCount})
              </button>
              <button
                type="button"
                onClick={() => setShowIdle(true)}
                className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                  showIdle ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({live.seats.length})
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {groupedSeats.map(({ team, seats }) => (
              <div key={team}>
                <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {team}
                </h4>
                <div className="space-y-1.5">
                  {seats.map((seat) => {
                    const human = humanizeSeat(seat.id);
                    const act = seatActivitySummary(seat);
                    const traffic = seatTraffic.get(seat.id) ?? 0;
                    const barPct =
                      traffic > 0 ? Math.max(8, Math.round((traffic / maxTraffic) * 100)) : 0;
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
                        className={`group flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2 transition-all cursor-pointer ${
                          act.isWorking
                            ? 'border-[var(--color-border-subtle)] bg-slate-950/60 hover:border-sky-400/50'
                            : 'border-transparent bg-slate-950/30 opacity-65 hover:opacity-100 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                act.isWorking ? 'bg-emerald-400 animate-signal' : 'bg-slate-600'
                              }`}
                            />
                            <span className="text-xs font-semibold text-slate-100 truncate">
                              {human.name}
                            </span>
                            <span className="hidden sm:inline font-mono text-[10px] text-slate-500">
                              {seat.id}
                            </span>
                          </div>
                          <div className="mt-0.5 pl-4 text-[11px] text-slate-400 flex flex-wrap items-center gap-x-1.5">
                            {targetIsLemma && act.target ? (
                              <span>
                                {act.verb}{' '}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectLemma(act.target!);
                                  }}
                                  className="font-mono text-[10.5px] text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded px-1.5 hover:bg-emerald-500/25 cursor-pointer"
                                >
                                  {act.target}
                                </button>
                              </span>
                            ) : (
                              <span>{act.label}</span>
                            )}
                            {act.since && (
                              <span className="text-slate-500">
                                · {fmtRelativeTime(act.since, nowMs)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {traffic > 0 && (
                            <div className="hidden sm:flex flex-col items-end w-14">
                              <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                                {traffic}
                              </span>
                              <div className="mt-0.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-sky-400"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-sky-300 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deep-dive Raw Data Drawers */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenMessages}
            className="group rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 hover:border-sky-400/50 p-4 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-sky-400">
              <MessageSquare className="h-4 w-4" />
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-sky-300" />
            </div>
            <div className="mt-2.5 font-[var(--font-display)] text-sm font-bold text-white">
              Raw Agent Chatter
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
              {fmtNumber(live.messages.length)} shown ·{' '}
              {fmtNumber(live.not_shown_last_hour ?? 0)} held
            </p>
          </button>

          <button
            type="button"
            onClick={onOpenChecker}
            className="group rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 hover:border-emerald-400/50 p-4 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-300" />
            </div>
            <div className="mt-2.5 font-[var(--font-display)] text-sm font-bold text-white">
              Lean 4 Checker Log
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
              {fmtNumber(live.checker_runs.length)} runs in last hour
            </p>
          </button>
        </div>

        {/* Outside Contributors */}
        {head.outside && (
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-4 text-xs">
            <div className="flex items-center justify-between gap-2 text-slate-300 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <GitPullRequest className="h-3.5 w-3.5 text-emerald-400" />
                Outside Contributor Swarm
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {fmtNumber(head.outside.count)} devs · {fmtNumber(head.outside.steps)} proofs
              </span>
            </div>
            {head.outside.newest && (
              <p className="mt-2 text-slate-400 leading-relaxed">
                Latest verified PR from{' '}
                <a
                  href={`https://github.com/${head.outside.newest.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sky-300 hover:underline"
                >
                  @{head.outside.newest.github}
                </a>{' '}
                on{' '}
                <button
                  type="button"
                  onClick={() => onSelectLemma(head.outside!.newest!.lemma_id)}
                  className="font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded px-1.5 py-0.5 hover:bg-emerald-500/25 cursor-pointer"
                >
                  {head.outside.newest.lemma_id}
                </button>{' '}
                <span className="text-slate-500">
                  ({fmtRelativeTime(head.outside.newest.at, nowMs)})
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
