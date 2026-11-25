import React, { useMemo, useState } from 'react';
import { Flame, Search, Layers } from 'lucide-react';
import { statusOfLemma } from '../api/pnpClient';
import type { AttackStatus, OverviewMap } from '../types/pnp';
import {
  ATTACK_STATUS_STYLES,
  STATUS_STYLES,
  programMeta,
} from '../utils/format';
import { LinkedText } from './LinkedText';

interface AttackLinesSectionProps {
  map: OverviewMap;
  onSelectLemma: (lemmaId: string) => void;
  onSelectProgram: (programId: string) => void;
}

type AttackFilter = AttackStatus | 'all';

const TAB_ORDER: AttackFilter[] = ['live', 'support', 'stopped', 'dormant', 'all'];

export const AttackLinesSection: React.FC<AttackLinesSectionProps> = ({
  map,
  onSelectLemma,
  onSelectProgram,
}) => {
  const [filter, setFilter] = useState<AttackFilter>('live');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c: Record<AttackFilter, number> = {
      live: 0,
      support: 0,
      stopped: 0,
      dormant: 0,
      all: map.attack.length,
    };
    for (const line of map.attack) {
      if (line.status in c) c[line.status] += 1;
    }
    return c;
  }, [map.attack]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return map.attack.filter((line) => {
      if (filter !== 'all' && line.status !== filter) return false;
      if (!q) return true;
      return (
        line.title.toLowerCase().includes(q) ||
        line.why.toLowerCase().includes(q) ||
        line.program.toLowerCase().includes(q) ||
        line.rows.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [map.attack, filter, query]);

  const tabLabel = (t: AttackFilter) => {
    if (t === 'all') return 'All Lines';
    if (t === 'live') return 'Active Right Now';
    if (t === 'support') return 'Supporting';
    if (t === 'stopped') return 'Stopped / Dead Ends';
    return 'Dormant';
  };

  return (
    <section id="attacks" className="scroll-mt-28">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            <Flame className="h-3.5 w-3.5 text-amber-600" />
            Lines of Attack
          </div>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
            What’s Alive vs. What Hit a Wall
          </h2>
          <p className="mt-1 text-sm text-stone-600 max-w-2xl">
            Out of <strong className="font-medium text-stone-800">{counts.all}</strong> specific strategies tried so far,{' '}
            <strong className="font-medium text-emerald-800">{counts.live} are actively live</strong>,{' '}
            <strong className="font-medium text-sky-800">{counts.support} provide supporting tools</strong>, and{' '}
            <strong className="font-medium text-rose-800">{counts.stopped} have been stopped</strong> after hitting counterexamples or barriers.
          </p>
        </div>

        {/* Search filter */}
        <div className="relative w-full md:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter attack lines..."
            aria-label="Filter attack lines"
            className="w-full rounded-xl border border-[var(--color-hairline-strong)] bg-white pl-9 pr-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {TAB_ORDER.map((tab) => {
          const active = filter === tab;
          const style = tab !== 'all' ? ATTACK_STATUS_STYLES[tab] : null;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                active
                  ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                  : 'border-[var(--color-hairline-strong)] bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-400'
              }`}
            >
              {style && (
                <span
                  className={`h-2 w-2 rounded-full ${active ? 'bg-white' : style.dot}`}
                />
              )}
              <span>{tabLabel(tab)}</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-stone-300' : 'text-stone-400'
                }`}
              >
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Attack Line Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-stone-500">
          No attack lines match that filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((line) => {
            const st = ATTACK_STATUS_STYLES[line.status];
            const pMeta = programMeta(line.program);
            return (
              <div
                key={line.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.03)] hover:border-stone-300 transition-colors"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.pill}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${st.dot} ${
                          line.status === 'live' ? 'animate-live-dot' : ''
                        }`}
                      />
                      {st.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectProgram(line.program)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 cursor-pointer transition-colors"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: pMeta.color }}
                      />
                      {pMeta.shortTitle}
                    </button>
                  </div>

                  <h3 className="font-serif text-lg font-semibold leading-snug text-[var(--color-ink)]">
                    {line.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    <LinkedText
                      text={line.why}
                      map={map}
                      onSelectLemma={onSelectLemma}
                    />
                  </p>
                </div>

                {line.rows.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--color-hairline)]/70 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 mr-1">
                      <Layers className="h-3 w-3" />
                      Key lemmas:
                    </span>
                    {line.rows.map((id) => {
                      const lemmaStatus = statusOfLemma(map, id);
                      const dotClass = lemmaStatus
                        ? STATUS_STYLES[lemmaStatus].dot
                        : 'bg-stone-400';
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onSelectLemma(id)}
                          title={
                            lemmaStatus
                              ? `${id} · ${STATUS_STYLES[lemmaStatus].label}`
                              : id
                          }
                          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-[var(--color-paper)] hover:bg-stone-200/70 px-2 py-0.5 font-mono text-[11px] font-medium text-stone-700 transition-colors cursor-pointer"
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
      )}
    </section>
  );
};
