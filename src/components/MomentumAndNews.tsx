import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ExternalLink,
  FileText,
  Newspaper,
} from 'lucide-react';
import type {
  CalendarMonthData,
  NewsArticleSummary,
  NewsIndex,
  PapersData,
} from '../types/pnp';
import { fmtNumber, fmtRelativeTime, programMeta } from '../utils/format';

interface MomentumAndNewsProps {
  calendarMonth: CalendarMonthData | null;
  news: NewsIndex | null;
  papers: PapersData | null;
  nowMs: number;
  onSelectArticle: (article: NewsArticleSummary) => void;
  onSelectLemma: (lemmaId: string) => void;
}

interface BarDatum {
  key: string;
  label: string;
  sublabel: string;
  checked: number;
  refuted: number;
  total: number;
}

export const MomentumAndNews: React.FC<MomentumAndNewsProps> = ({
  calendarMonth,
  news,
  papers,
  nowMs,
  onSelectArticle,
  onSelectLemma,
}) => {
  const [chartMode, setChartMode] = useState<'daily' | 'hourly'>('daily');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showAllNews, setShowAllNews] = useState(false);

  const { bars, maxTotal, monthPrefix } = useMemo(() => {
    if (!calendarMonth?.days) {
      return { bars: [] as BarDatum[], maxTotal: 1, monthPrefix: '' };
    }
    const [yyyy, mm] = calendarMonth.month.split('-');
    const monthName = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1)).toLocaleDateString(
      'en-US',
      { month: 'short', timeZone: 'UTC' }
    );
    const sortedDays = Object.keys(calendarMonth.days).sort((a, b) => Number(a) - Number(b));

    if (chartMode === 'daily') {
      const list: BarDatum[] = sortedDays.map((d) => {
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
      const max = Math.max(1, ...list.map((x) => x.total));
      return { bars: list, maxTotal: max, monthPrefix: monthName };
    }

    // Hourly mode for the most recent day in the calendar
    const latestDayKey = sortedDays[sortedDays.length - 1];
    const latestDay = calendarMonth.days[latestDayKey];
    const hourMap = new Map<number, { checked: number; refuted: number }>();
    let maxHour = 0;

    if (latestDay?.lanes) {
      for (const rows of Object.values(latestDay.lanes)) {
        for (const [hour, checked, refuted] of rows) {
          maxHour = Math.max(maxHour, hour);
          const cur = hourMap.get(hour) ?? { checked: 0, refuted: 0 };
          cur.checked += checked;
          cur.refuted += refuted;
          hourMap.set(hour, cur);
        }
      }
    }

    const list: BarDatum[] = [];
    for (let h = 0; h <= maxHour; h += 1) {
      const val = hourMap.get(h) ?? { checked: 0, refuted: 0 };
      list.push({
        key: String(h),
        label: `${String(h).padStart(2, '0')}:00`,
        sublabel: `${monthName} ${Number(latestDayKey)} · ${String(h).padStart(2, '0')}:00 UTC`,
        checked: val.checked,
        refuted: val.refuted,
        total: val.checked + val.refuted,
      });
    }
    const max = Math.max(1, ...list.map((x) => x.total));
    return { bars: list, maxTotal: max, monthPrefix: `${monthName} ${Number(latestDayKey)}` };
  }, [calendarMonth, chartMode]);

  const hoveredBar = hoveredIdx !== null ? bars[hoveredIdx] : bars[bars.length - 1] ?? null;

  const articles = news?.articles ?? [];
  const visibleArticles = showAllNews ? articles.slice(0, 14) : articles.slice(0, 5);
  const publishedPapers = (papers?.papers ?? []).filter((p) => p.state === 'published');

  return (
    <section id="momentum" className="scroll-mt-28 space-y-6">
      {/* Campaign Momentum Card */}
      {bars.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(24,24,27,0.03)]">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                <BarChart3 className="h-3.5 w-3.5 text-stone-400" />
                Campaign Momentum
              </div>
              <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--color-ink)]">
                Verified vs. Refuted Pace
              </h3>
            </div>

            <div className="inline-flex rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setChartMode('daily');
                  setHoveredIdx(null);
                }}
                className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                  chartMode === 'daily'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
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
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Today Hourly
              </button>
            </div>
          </div>

          {/* Readout strip */}
          {hoveredBar && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-paper)] border border-[var(--color-hairline)]/80 px-3.5 py-2 text-xs">
              <span className="font-medium text-stone-800">
                {chartMode === 'hourly' ? hoveredBar.sublabel : `${hoveredBar.label} (${hoveredBar.sublabel})`}
              </span>
              <div className="flex items-center gap-4 font-mono tabular-nums">
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  {fmtNumber(hoveredBar.checked)} checked
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-700 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  {fmtNumber(hoveredBar.refuted)} refuted
                </span>
              </div>
            </div>
          )}

          {/* Vertical Stacked Bar Chart */}
          <div
            className="flex items-end gap-2 h-36 pt-3 pb-1 px-1"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {bars.map((b, idx) => {
              const heightPct = b.total > 0 ? Math.max(6, Math.round((b.total / maxTotal) * 100)) : 2;
              const checkedShare = b.total > 0 ? (b.checked / b.total) * 100 : 100;
              const isSelected =
                hoveredIdx === idx || (hoveredIdx === null && idx === bars.length - 1);

              return (
                <div
                  key={b.key}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 cursor-pointer group"
                >
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-14 rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-150 ${
                        isSelected ? 'ring-2 ring-stone-400/50' : 'opacity-85 group-hover:opacity-100'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {b.refuted > 0 && (
                        <div
                          className="w-full bg-rose-400/90"
                          style={{ height: `${100 - checkedShare}%` }}
                        />
                      )}
                      {b.checked > 0 && (
                        <div
                          className="w-full bg-emerald-600"
                          style={{ height: `${checkedShare}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[10px] tabular-nums whitespace-nowrap ${
                      isSelected ? 'font-semibold text-stone-900' : 'text-stone-400'
                    }`}
                  >
                    {chartMode === 'hourly'
                      ? idx % 3 === 0 || idx === bars.length - 1
                        ? b.label.slice(0, 2) + 'h'
                        : ''
                      : b.label}
                  </span>
                </div>
              );
            })}
          </div>
          {chartMode === 'hourly' && (
            <p className="mt-1 text-[11px] text-stone-400 text-right">
              UTC hours for {monthPrefix}
            </p>
          )}
        </div>
      )}

      {/* Editorial Dispatches (News) */}
      {articles.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(24,24,27,0.03)]">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--color-hairline)]">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                <Newspaper className="h-3.5 w-3.5 text-stone-400" />
                Fleet Dispatches
              </div>
              <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--color-ink)]">
                Plain-English Progress Reports
              </h3>
            </div>
            <span className="font-mono text-xs text-stone-400 tabular-nums">
              {articles.length} dispatches
            </span>
          </div>

          <div className="divide-y divide-[var(--color-hairline)]/80">
            {visibleArticles.map((art) => {
              const pMeta = programMeta(art.program);
              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onSelectArticle(art)}
                  className="group w-full py-4 text-left flex flex-col gap-1.5 hover:bg-[var(--color-paper)]/60 -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-stone-500">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: pMeta.color }}
                      />
                      {pMeta.shortTitle}
                    </span>
                    <span className="text-stone-400 tabular-nums">
                      {fmtRelativeTime(art.published_at, nowMs)}
                    </span>
                  </div>

                  <h4 className="font-serif text-[1.05rem] font-semibold leading-snug text-[var(--color-ink)] group-hover:text-black">
                    {art.title}
                  </h4>

                  <p className="text-xs leading-relaxed text-stone-600 line-clamp-2">
                    {art.dek}
                  </p>

                  <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 group-hover:text-stone-900 mt-0.5">
                    Read dispatch
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>

          {articles.length > 5 && (
            <div className="pt-3 border-t border-[var(--color-hairline)]/80">
              <button
                type="button"
                onClick={() => setShowAllNews((v) => !v)}
                className="text-xs font-medium text-stone-600 hover:text-stone-950 cursor-pointer"
              >
                {showAllNews ? 'Show fewer dispatches' : `Show more dispatches (${articles.length} total)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Published Notes / Papers */}
      {publishedPapers.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.03)]">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 mb-3">
            <BookOpen className="h-3.5 w-3.5 text-emerald-700" />
            Published Written Notes
          </div>
          <div className="space-y-3">
            {publishedPapers.map((paper) => {
              const claims = paper.sections?.flatMap((s) => s.claims) ?? [];
              return (
                <div
                  key={paper.id}
                  className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)]/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <FileText className="h-4 w-4 text-stone-500 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-serif text-base font-semibold text-stone-900">
                          {paper.title}
                        </h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Human-readable write-up backed by {claims.length} checked Lean claims
                        </p>
                      </div>
                    </div>
                    {paper.url && (
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 shrink-0"
                      >
                        Read
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {claims.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {claims.slice(0, 8).map((c) => (
                        <button
                          key={c.lemma_id}
                          type="button"
                          onClick={() => onSelectLemma(c.lemma_id)}
                          className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 font-mono text-[11px] text-emerald-800 hover:bg-emerald-100 cursor-pointer transition-colors"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          {c.lemma_id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
