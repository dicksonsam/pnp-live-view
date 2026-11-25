import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  GitPullRequest,
  Loader2,
  MessageSquare,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  SITE_BASE,
  cleanCheckedTitle,
  fetchArticleDetail,
  fetchLemmaDetail,
  fetchSeatDetail,
  statusOfLemma,
} from '../api/pnpClient';
import type {
  DrawerView,
  LemmaDetail,
  NewsArticleDetail,
  ObservatorySnapshot,
  SeatDetail,
} from '../types/pnp';
import {
  AIM_LABELS,
  ATTACK_STATUS_STYLES,
  MESSAGE_PUBLISH_DELAY_MS,
  STATUS_STYLES,
  fmtNumber,
  fmtRelativeTime,
  fmtShortDate,
  fmtUtcTime,
  humanizeSeat,
  programMeta,
  seatActivitySummary,
} from '../utils/format';
import { LinkedText } from './LinkedText';

interface InspectorDrawerProps {
  stack: DrawerView[];
  snapshot: ObservatorySnapshot;
  nowMs: number;
  onPush: (view: DrawerView) => void;
  onPop: () => void;
  onClose: () => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  stack,
  snapshot,
  nowMs,
  onPush,
  onPop,
  onClose,
}) => {
  const current = stack[stack.length - 1] ?? null;

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, onClose]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="animate-drawer-in relative z-10 flex h-full w-full max-w-2xl flex-col bg-[var(--color-paper)] shadow-2xl border-l border-[var(--color-hairline-strong)]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-hairline)] bg-white px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {stack.length > 1 && (
              <button
                type="button"
                onClick={onPop}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">
              {current.kind === 'program' && 'Research Front Inspector'}
              {current.kind === 'lemma' && `Lemma · ${current.lemmaId}`}
              {current.kind === 'seat' && `Orchestrator · ${current.seatId}`}
              {current.kind === 'article' && `Dispatch · ${current.article.id}`}
              {current.kind === 'messages' && 'Inside the Hub · Live Messages'}
              {current.kind === 'checker' && 'Lean 4 Checker · Last Hour'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {current.kind === 'program' && (
            <ProgramDrawerContent
              programId={current.programId}
              snapshot={snapshot}
              onSelectLemma={(id) => onPush({ kind: 'lemma', lemmaId: id })}
              onSelectSeat={(id) => onPush({ kind: 'seat', seatId: id })}
            />
          )}
          {current.kind === 'lemma' && (
            <LemmaDrawerContent
              lemmaId={current.lemmaId}
              snapshot={snapshot}
              onSelectLemma={(id) => onPush({ kind: 'lemma', lemmaId: id })}
              onSelectSeat={(id) => onPush({ kind: 'seat', seatId: id })}
              onSelectProgram={(id) => onPush({ kind: 'program', programId: id })}
            />
          )}
          {current.kind === 'seat' && (
            <SeatDrawerContent
              seatId={current.seatId}
              snapshot={snapshot}
              nowMs={nowMs}
              onSelectLemma={(id) => onPush({ kind: 'lemma', lemmaId: id })}
              onSelectSeat={(id) => onPush({ kind: 'seat', seatId: id })}
            />
          )}
          {current.kind === 'article' && (
            <ArticleDrawerContent
              summary={current.article}
              snapshot={snapshot}
              onSelectLemma={(id) => onPush({ kind: 'lemma', lemmaId: id })}
              onSelectSeat={(id) => onPush({ kind: 'seat', seatId: id })}
            />
          )}
          {current.kind === 'messages' && (
            <MessagesDrawerContent
              initialSeat={current.filterSeat}
              snapshot={snapshot}
              nowMs={nowMs}
              onSelectLemma={(id) => onPush({ kind: 'lemma', lemmaId: id })}
              onSelectSeat={(id) => onPush({ kind: 'seat', seatId: id })}
            />
          )}
          {current.kind === 'checker' && (
            <CheckerDrawerContent
              initialFilter={current.filterAccepted ?? 'all'}
              snapshot={snapshot}
              nowMs={nowMs}
              onSelectLemma={(id) => onPush({ kind: 'lemma', lemmaId: id })}
              onSelectSeat={(id) => onPush({ kind: 'seat', seatId: id })}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------- 1. PROGRAM DETAIL ----------------
const ProgramDrawerContent: React.FC<{
  programId: string;
  snapshot: ObservatorySnapshot;
  onSelectLemma: (id: string) => void;
  onSelectSeat: (id: string) => void;
}> = ({ programId, snapshot, onSelectLemma, onSelectSeat }) => {
  const prog = snapshot.map.programs.find((p) => p.id === programId);
  const progPlan = snapshot.plan?.programs?.[programId];
  const meta = programMeta(programId);

  if (!prog) {
    return <p className="text-sm text-stone-500">Program not found in the current snapshot.</p>;
  }

  const aim = AIM_LABELS[prog.aims_at];
  const attacks = snapshot.map.attack.filter((a) => a.program === programId);
  const seats = snapshot.live.seats.filter((s) => s.program === programId);
  const hard = progPlan?.hard_link;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${aim.className}`}>
            {aim.label}
          </span>
          <span className="font-mono text-xs text-stone-400">
            {fmtNumber(prog.counts.checked)} checked · {fmtNumber(prog.counts.refuted)} refuted ·{' '}
            {fmtNumber(prog.counts.conjecture)} open
          </span>
        </div>

        <h2 className="mt-2.5 font-serif text-2xl sm:text-3xl font-semibold text-stone-900 flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
          {progPlan?.short_name ?? prog.title}
        </h2>
        <p className="mt-2 rounded-lg bg-white border border-[var(--color-hairline)] px-3 py-2 text-xs leading-relaxed text-stone-700">
          <strong className="font-semibold text-stone-900">How this connects to P vs NP:</strong>{' '}
          {meta.pnpBridge}
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-stone-700">
          {progPlan?.target?.plain ?? prog.goal}
        </p>

        {progPlan?.target?.lemma_id && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-500">Target theorem:</span>
            <button
              type="button"
              onClick={() => onSelectLemma(progPlan.target.lemma_id!)}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1 font-mono text-xs font-medium text-stone-800 hover:bg-stone-100 cursor-pointer"
            >
              {progPlan.target.lemma_id}
              <ExternalLink className="h-3 w-3 text-stone-400" />
            </button>
          </div>
        )}
      </div>

      {/* Bottleneck / Hard Link or Milestone Status */}
      {hard && (() => {
        const hasHardLink = !/^(none|no |n\/a)/i.test((hard.title ?? '').trim());
        return (
          <div
            className={`rounded-xl border p-4 space-y-2 ${
              hasHardLink
                ? 'border-amber-200/90 bg-amber-50/60'
                : 'border-emerald-200/80 bg-emerald-50/45'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${
                  hasHardLink ? 'text-amber-900' : 'text-emerald-900'
                }`}
              >
                {hasHardLink ? (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                {hasHardLink ? 'Current Bottleneck (Hard Link)' : 'Milestone Status'}
              </span>
              {hard.lemma_id && (
                <button
                  type="button"
                  onClick={() => onSelectLemma(hard.lemma_id!)}
                  className="font-mono text-xs font-medium text-amber-900 underline decoration-amber-400 underline-offset-2 cursor-pointer"
                >
                  {hard.lemma_id}
                </button>
              )}
            </div>
            {hasHardLink && (
              <p className="text-sm font-medium text-stone-900">{hard.title}</p>
            )}
            {hard.plain && (
              <p className="text-xs leading-relaxed text-stone-800">{hard.plain}</p>
            )}
            {hard.why_hard && (
              <p className="text-xs leading-relaxed text-stone-700">
                <LinkedText
                  text={hard.why_hard}
                  map={snapshot.map}
                  onSelectLemma={onSelectLemma}
                />
              </p>
            )}
            {hard.attempts_died && hard.attempts_died.length > 0 && (
              <div className="pt-2 mt-2 border-t border-amber-200/70 space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800/80">
                  Recorded Dead Ends on This Link
                </span>
                {hard.attempts_died.map((d, idx) => (
                  <p key={idx} className="text-xs text-stone-600 leading-relaxed">
                    <strong className="font-mono text-stone-800">{d.by}:</strong> {d.why_died}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Proof Chain Timeline */}
      {progPlan?.chain && progPlan.chain.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
            Proof Chain Milestones ({progPlan.chain.length} steps)
          </h3>
          <ol className="relative border-l-2 border-stone-200 ml-2.5 space-y-3">
            {progPlan.chain.map((step, idx) => {
              const liveStatus =
                (step.lemma_id ? statusOfLemma(snapshot.map, step.lemma_id) : null) ??
                step.status ??
                'conjecture';
              const style = STATUS_STYLES[liveStatus];
              const cleanTitle = cleanCheckedTitle(step.title, liveStatus);

              return (
                <li key={idx} className="pl-5 relative">
                  <span
                    className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-[var(--color-paper)] ${style.dot}`}
                  />
                  <div className="rounded-xl border border-[var(--color-hairline)] bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.pill}`}
                      >
                        {style.label}
                      </span>
                      {step.lemma_id && (
                        <button
                          type="button"
                          onClick={() => onSelectLemma(step.lemma_id!)}
                          className="font-mono text-xs font-medium text-stone-700 hover:text-black underline decoration-stone-300 underline-offset-2 cursor-pointer"
                        >
                          {step.lemma_id} →
                        </button>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-stone-800">{cleanTitle}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Associated Attack Lines */}
      {attacks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
            Attack Lines Under This Front ({attacks.length})
          </h3>
          <div className="space-y-2">
            {attacks.map((a) => {
              const st = ATTACK_STATUS_STYLES[a.status];
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-[var(--color-hairline)] bg-white p-3.5"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                  <p className="mt-1.5 text-sm font-medium text-stone-900">{a.title}</p>
                  <p className="mt-1 text-xs text-stone-600 leading-relaxed">{a.why}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Program Seats */}
      {seats.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
            Assigned Orchestrator Seats ({seats.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {seats.map((s) => {
              const human = humanizeSeat(s.id);
              const act = seatActivitySummary(s);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSeat(s.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs hover:border-stone-400 cursor-pointer"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      act.isWorking ? 'bg-emerald-500' : 'bg-stone-300'
                    }`}
                  />
                  <span className="font-medium text-stone-800">{human.name}</span>
                  <span className="font-mono text-[11px] text-stone-400">{s.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- 2. LEMMA DETAIL ----------------
const LemmaDrawerContent: React.FC<{
  lemmaId: string;
  snapshot: ObservatorySnapshot;
  onSelectLemma: (id: string) => void;
  onSelectSeat: (id: string) => void;
  onSelectProgram: (id: string) => void;
}> = ({ lemmaId, snapshot, onSelectLemma, onSelectSeat, onSelectProgram }) => {
  const [detail, setDetail] = useState<LemmaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormal, setShowFormal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setShowFormal(false);

    fetchLemmaDetail(snapshot.map, lemmaId)
      .then((res) => {
        if (!active) return;
        if (!res) setError('This lemma ID was not found in the published record.');
        else setDetail(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load lemma record.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lemmaId, snapshot.map]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-stone-500 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Fetching verified record for {lemmaId}...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error ?? 'Lemma not found.'}
      </div>
    );
  }

  const style = STATUS_STYLES[detail.status] ?? STATUS_STYLES.conjecture;
  const pMeta = programMeta(detail.program);

  const copyFormal = () => {
    if (!detail.formal_statement) return;
    navigator.clipboard.writeText(detail.formal_statement).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="space-y-5">
      {/* Status & Metadata */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.pill}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {style.label}
          </span>

          <button
            type="button"
            onClick={() => onSelectProgram(detail.program)}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-medium text-stone-700 hover:border-stone-400 cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pMeta.color }} />
            {pMeta.shortTitle}
          </button>

          <a
            href={`${SITE_BASE}lemma#${detail.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900"
          >
            Open on pequalnp.com
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <h2 className="mt-3 font-serif text-xl sm:text-2xl font-semibold leading-snug text-stone-900">
          {detail.title}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span className="font-mono">{detail.id}</span>
          {detail.seat && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => onSelectSeat(detail.seat!)}
                className="underline decoration-stone-300 underline-offset-2 hover:text-stone-900 cursor-pointer"
              >
                {humanizeSeat(detail.seat).name} ({detail.seat})
              </button>
            </>
          )}
          {detail.status_at && (
            <>
              <span>·</span>
              <span>Updated {fmtShortDate(detail.status_at)}</span>
            </>
          )}
        </div>
      </div>

      {/* Plain-English Statement */}
      {detail.plain_statement && (
        <div className="rounded-xl border border-[var(--color-hairline)] bg-white p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
            Plain-English Statement
          </h3>
          <p className="text-sm leading-relaxed text-stone-800">
            <LinkedText
              text={detail.plain_statement}
              map={snapshot.map}
              onSelectLemma={onSelectLemma}
            />
          </p>
        </div>
      )}

      {/* Verification Artifact & External Contributor */}
      {(detail.artifact || detail.contributor) && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/45 p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Lean 4 Verification Record
          </div>
          {detail.contributor?.github && (
            <div className="flex flex-wrap items-center gap-2 text-stone-700">
              <GitPullRequest className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                Contributed by{' '}
                <a
                  href={`https://github.com/${detail.contributor.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold text-stone-900 underline decoration-stone-300"
                >
                  @{detail.contributor.github}
                </a>
              </span>
              {detail.contributor.pr_url && (
                <a
                  href={detail.contributor.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-white border border-emerald-200 px-2 py-0.5 font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  View GitHub PR
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          {detail.artifact?.lean_file && (
            <div className="font-mono text-[11px] text-stone-600 break-all">
              File: {detail.artifact.lean_file}
            </div>
          )}
          {detail.artifact?.runner_url && (
            <a
              href={detail.artifact.runner_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:text-emerald-950 underline decoration-emerald-300 underline-offset-2"
            >
              Inspect Lean CI Runner Log
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Dependencies */}
      {((detail.depends_on && detail.depends_on.length > 0) ||
        (detail.used_by && detail.used_by.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {detail.depends_on && detail.depends_on.length > 0 && (
            <div className="rounded-xl border border-[var(--color-hairline)] bg-white p-3.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                Depends On ({detail.depends_on.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {detail.depends_on.map((id) => {
                  const st = statusOfLemma(snapshot.map, id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectLemma(id)}
                      className="inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-700 hover:bg-stone-200/70 cursor-pointer"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${st ? STATUS_STYLES[st].dot : 'bg-stone-400'}`} />
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {detail.used_by && detail.used_by.length > 0 && (
            <div className="rounded-xl border border-[var(--color-hairline)] bg-white p-3.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                Used By ({detail.used_by.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {detail.used_by.map((id) => {
                  const st = statusOfLemma(snapshot.map, id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectLemma(id)}
                      className="inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-700 hover:bg-stone-200/70 cursor-pointer"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${st ? STATUS_STYLES[st].dot : 'bg-stone-400'}`} />
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Formal Lean 4 Statement */}
      {detail.formal_statement && (
        <div className="rounded-xl border border-[var(--color-hairline)] bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFormal((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Code2 className="h-4 w-4 text-stone-500" />
              Formal Lean 4 Statement
            </span>
            {showFormal ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {showFormal && (
            <div className="border-t border-[var(--color-hairline)] bg-stone-900 p-4 relative">
              <button
                type="button"
                onClick={copyFormal}
                className="absolute top-3 right-3 inline-flex items-center gap-1 rounded bg-stone-800 px-2 py-1 text-[11px] text-stone-300 hover:bg-stone-700 cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <pre className="font-mono text-xs leading-relaxed text-stone-200 whitespace-pre-wrap break-words pr-16">
                {detail.formal_statement}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Attempts Log */}
      {detail.attempts && detail.attempts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Attempt History ({detail.attempts.length})
          </h3>
          <div className="space-y-2">
            {detail.attempts.slice(-8).reverse().map((att, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--color-hairline)] bg-white px-3.5 py-2.5 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-stone-800">{att.by}</span>
                  <span className="text-stone-400">{fmtShortDate(att.when)}</span>
                </div>
                <div className="text-stone-600">
                  Outcome: <strong className="text-stone-900">{att.outcome}</strong>
                  {att.why_died ? ` — ${att.why_died}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- 3. SEAT DETAIL ----------------
const SeatDrawerContent: React.FC<{
  seatId: string;
  snapshot: ObservatorySnapshot;
  nowMs: number;
  onSelectLemma: (id: string) => void;
  onSelectSeat: (id: string) => void;
}> = ({ seatId, snapshot, nowMs, onSelectLemma, onSelectSeat }) => {
  const [detail, setDetail] = useState<SeatDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const liveSeat = snapshot.live.seats.find((s) => s.id === seatId);
  const human = humanizeSeat(seatId);
  const act = liveSeat ? seatActivitySummary(liveSeat) : null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSeatDetail(snapshot.seats, seatId)
      .then((res) => {
        if (!active) return;
        setDetail(res);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [seatId, snapshot.seats]);

  const recentMsgs = useMemo(
    () =>
      snapshot.live.messages
        .filter((m) => m.from === seatId || m.to === seatId)
        .slice(0, 10),
    [snapshot.live.messages, seatId]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 font-medium text-stone-700">
            {human.team}
          </span>
          <span className="font-mono">{seatId}</span>
        </div>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-stone-900">{human.name}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
          {detail?.mandate ?? human.roleSummary}
        </p>

        {act && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--color-hairline)] bg-white px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                act.isWorking ? 'bg-emerald-500 animate-live-dot' : 'bg-stone-300'
              }`}
            />
            <span className="font-medium text-stone-800">{act.label}</span>
            {act.since && (
              <span className="text-stone-400">· {fmtRelativeTime(act.since, nowMs)}</span>
            )}
          </div>
        )}
      </div>

      {/* Lifetime Stats */}
      {detail?.counts && (
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-[var(--color-hairline)] bg-white p-3.5 text-center">
          <div>
            <div className="font-mono text-lg font-semibold text-emerald-700 tabular-nums">
              {fmtNumber(detail.counts.checked)}
            </div>
            <div className="text-[11px] text-stone-500">Checked</div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-rose-700 tabular-nums">
              {fmtNumber(detail.counts.refuted)}
            </div>
            <div className="text-[11px] text-stone-500">Refuted</div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-stone-800 tabular-nums">
              {fmtNumber(detail.counts.attempts)}
            </div>
            <div className="text-[11px] text-stone-500">Attempts</div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-amber-700 tabular-nums">
              {fmtNumber(detail.counts.objections_filed)}
            </div>
            <div className="text-[11px] text-stone-500">Objections</div>
          </div>
        </div>
      )}

      {/* Currently Held Lemmas */}
      {liveSeat && liveSeat.holds.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Currently Holding ({liveSeat.holds.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {liveSeat.holds.map((id) => {
              const st = statusOfLemma(snapshot.map, id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectLemma(id)}
                  className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 font-mono text-xs text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${st ? STATUS_STYLES[st].dot : 'bg-stone-400'}`} />
                  {id}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Messages */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
          Recent Messages (Last Hour · {recentMsgs.length})
        </h3>
        {recentMsgs.length === 0 ? (
          <p className="text-xs text-stone-500">No public messages involving this seat in the last hour.</p>
        ) : (
          <div className="space-y-2.5">
            {recentMsgs.map((m, idx) => (
              <div
                key={`${m.at}-${idx}`}
                className="rounded-xl border border-[var(--color-hairline)] bg-white p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-stone-500">
                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => onSelectSeat(m.from)}
                      className="font-semibold text-stone-800 hover:underline cursor-pointer"
                    >
                      {m.from}
                    </button>
                    <span>→</span>
                    <button
                      type="button"
                      onClick={() => onSelectSeat(m.to)}
                      className="font-semibold text-stone-800 hover:underline cursor-pointer"
                    >
                      {m.to}
                    </button>
                  </div>
                  <span className="tabular-nums">
                    {fmtRelativeTime(
                      new Date(Date.parse(m.at) + MESSAGE_PUBLISH_DELAY_MS).toISOString(),
                      nowMs
                    )}
                  </span>
                </div>
                <p className="leading-relaxed text-stone-700">
                  <LinkedText text={m.text} map={snapshot.map} onSelectLemma={onSelectLemma} />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestones */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading seat milestone history...
        </div>
      ) : detail?.milestones && detail.milestones.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
            Recorded Milestones ({detail.milestones.length})
          </h3>
          <div className="space-y-2.5">
            {[...detail.milestones].reverse().slice(0, 10).map((ms) => (
              <div
                key={ms.id}
                className="rounded-xl border border-[var(--color-hairline)] bg-white p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-stone-400">{ms.id}</span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    {ms.outcome ?? ms.status}
                  </span>
                </div>
                <p className="font-medium text-stone-900">{ms.title}</p>
                {ms.conclusion && (
                  <p className="text-stone-600 leading-relaxed">
                    <LinkedText
                      text={ms.conclusion}
                      map={snapshot.map}
                      onSelectLemma={onSelectLemma}
                    />
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ---------------- 4. ARTICLE READER ----------------
const ArticleDrawerContent: React.FC<{
  summary: ObservatorySnapshot['news'] extends infer N
    ? N extends { articles: Array<infer A> }
      ? A
      : never
    : never;
  snapshot: ObservatorySnapshot;
  onSelectLemma: (id: string) => void;
  onSelectSeat: (id: string) => void;
}> = ({ summary, snapshot, onSelectLemma, onSelectSeat }) => {
  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchArticleDetail(summary.file)
      .then((res) => {
        if (!active) return;
        setArticle(res);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [summary.file]);

  const pMeta = programMeta(summary.program);

  return (
    <article className="space-y-5">
      <div className="border-b border-[var(--color-hairline)] pb-4">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pMeta.color }} />
            {pMeta.shortTitle}
          </span>
          <span>·</span>
          <span>{fmtShortDate(summary.published_at)}</span>
        </div>

        <h2 className="mt-2.5 font-serif text-2xl sm:text-3xl font-semibold leading-tight text-stone-900">
          {summary.title}
        </h2>
        <p className="mt-2 font-serif text-base italic text-stone-600 leading-relaxed">
          {summary.dek}
        </p>

        {(summary.author_seat || summary.editor_seat) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
            {summary.author_seat && (
              <button
                type="button"
                onClick={() => onSelectSeat(summary.author_seat!)}
                className="hover:text-stone-900 underline decoration-stone-300 underline-offset-2 cursor-pointer"
              >
                Written by {humanizeSeat(summary.author_seat).name}
              </button>
            )}
            {summary.editor_seat && (
              <button
                type="button"
                onClick={() => onSelectSeat(summary.editor_seat!)}
                className="hover:text-stone-900 underline decoration-stone-300 underline-offset-2 cursor-pointer"
              >
                Reviewed by {humanizeSeat(summary.editor_seat).name}
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading full dispatch...
        </div>
      ) : article?.body ? (
        <div className="space-y-4 text-[15px] leading-[1.72] text-stone-800">
          {article.body.map((block, idx) =>
            block.h ? (
              <h3
                key={idx}
                className="pt-2 font-serif text-lg font-semibold text-stone-950"
              >
                {block.h}
              </h3>
            ) : block.p ? (
              <p key={idx}>
                <LinkedText
                  text={block.p}
                  map={snapshot.map}
                  onSelectLemma={onSelectLemma}
                />
              </p>
            ) : null
          )}
        </div>
      ) : (
        <p className="text-sm text-stone-500">Could not load full article text.</p>
      )}
    </article>
  );
};

// ---------------- 5. LIVE MESSAGES STREAM ----------------
const MessagesDrawerContent: React.FC<{
  initialSeat?: string;
  snapshot: ObservatorySnapshot;
  nowMs: number;
  onSelectLemma: (id: string) => void;
  onSelectSeat: (id: string) => void;
}> = ({ initialSeat = '', snapshot, nowMs, onSelectLemma, onSelectSeat }) => {
  const [seatFilter, setSeatFilter] = useState(initialSeat);
  const [search, setSearch] = useState('');

  const { live, map } = snapshot;

  const activeSeatIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of live.messages) {
      set.add(m.from);
      set.add(m.to);
    }
    return [...set].sort();
  }, [live.messages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.messages.filter((m) => {
      if (seatFilter && m.from !== seatFilter && m.to !== seatFilter) return false;
      if (!q) return true;
      return (
        m.text.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q)
      );
    });
  }, [live.messages, seatFilter, search]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--color-hairline)] bg-white p-3.5 text-xs text-stone-600 leading-relaxed">
        <strong className="font-semibold text-stone-900">Raw inter-agent chatter:</strong>{' '}
        Orchestrators talk in hypotheses and rough solver outputs; <em>only Lean-checked lemmas are verified results</em>. Published on a 3-minute delay.{' '}
        {live.not_shown_last_hour ? (
          <span className="text-stone-500">
            ({fmtNumber(live.not_shown_last_hour)} messages were held back by the safety/isolation filter in the last hour.)
          </span>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages or lemma IDs..."
            className="w-full rounded-lg border border-[var(--color-hairline-strong)] bg-white pl-8 pr-3 py-1.5 text-xs focus:border-stone-500 focus:outline-none"
          />
        </div>

        <select
          value={seatFilter}
          onChange={(e) => setSeatFilter(e.target.value)}
          className="rounded-lg border border-[var(--color-hairline-strong)] bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-stone-500 focus:outline-none"
        >
          <option value="">All seats ({live.messages.length})</option>
          {activeSeatIds.map((id) => (
            <option key={id} value={id}>
              {humanizeSeat(id).name} ({id})
            </option>
          ))}
        </select>
      </div>

      {live.text_off ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          The operator temporarily paused the public message stream. Verified proofs and counters continue normally.
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-stone-500">
          <MessageSquare className="h-6 w-6 mx-auto mb-2 text-stone-300" />
          No messages match your filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((m, idx) => (
            <div
              key={`${m.at}-${m.from}-${idx}`}
              className="rounded-xl border border-[var(--color-hairline)] bg-white p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onSelectSeat(m.from)}
                    className="font-semibold text-stone-900 hover:underline cursor-pointer"
                  >
                    {humanizeSeat(m.from).name}
                  </button>
                  <span className="font-mono text-[11px] text-stone-400">({m.from})</span>
                  <span className="text-stone-400">→</span>
                  <button
                    type="button"
                    onClick={() => onSelectSeat(m.to)}
                    className="font-semibold text-stone-900 hover:underline cursor-pointer"
                  >
                    {humanizeSeat(m.to).name}
                  </button>
                </div>
                <span className="font-mono text-[11px] text-stone-400 tabular-nums">
                  {fmtRelativeTime(
                    new Date(Date.parse(m.at) + MESSAGE_PUBLISH_DELAY_MS).toISOString(),
                    nowMs
                  )}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap break-words">
                <LinkedText text={m.text} map={map} onSelectLemma={onSelectLemma} />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------- 6. LEAN CHECKER LOG ----------------
const CheckerDrawerContent: React.FC<{
  initialFilter: 'all' | 'accepted' | 'rejected';
  snapshot: ObservatorySnapshot;
  nowMs: number;
  onSelectLemma: (id: string) => void;
  onSelectSeat: (id: string) => void;
}> = ({ initialFilter, snapshot, nowMs, onSelectLemma, onSelectSeat }) => {
  const [filter, setFilter] = useState<'all' | 'accepted' | 'rejected'>(initialFilter);
  const [search, setSearch] = useState('');

  const runsNewestFirst = useMemo(
    () => [...snapshot.live.checker_runs].reverse(),
    [snapshot.live.checker_runs]
  );

  const acceptedCount = useMemo(
    () => runsNewestFirst.filter((r) => r.accepted).length,
    [runsNewestFirst]
  );
  const rejectedCount = runsNewestFirst.length - acceptedCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runsNewestFirst.filter((r) => {
      if (filter === 'accepted' && !r.accepted) return false;
      if (filter === 'rejected' && r.accepted) return false;
      if (!q) return true;
      return (
        r.lemma_id.toLowerCase().includes(q) ||
        r.seat.toLowerCase().includes(q) ||
        humanizeSeat(r.seat).name.toLowerCase().includes(q)
      );
    });
  }, [runsNewestFirst, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-[var(--color-hairline)] bg-white p-0.5 text-xs">
          {(
            [
              { id: 'all', label: `All (${runsNewestFirst.length})` },
              { id: 'accepted', label: `Accepted (${acceptedCount})` },
              { id: 'rejected', label: `Rejected (${rejectedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                filter === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter lemma or seat..."
            className="w-full rounded-lg border border-[var(--color-hairline-strong)] bg-white pl-8 pr-3 py-1.5 text-xs focus:border-stone-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-hairline)] bg-white overflow-hidden">
        <div className="divide-y divide-[var(--color-hairline)]/70">
          {filtered.slice(0, 120).map((run, idx) => (
            <div
              key={`${run.at}-${run.lemma_id}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs hover:bg-[var(--color-paper)]/70 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {run.accepted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => onSelectLemma(run.lemma_id)}
                  className="font-mono font-semibold text-stone-900 hover:underline cursor-pointer"
                >
                  {run.lemma_id}
                </button>
                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                  {run.kind === 'refute' ? 'counterexample' : 'proof'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-stone-500">
                <button
                  type="button"
                  onClick={() => onSelectSeat(run.seat)}
                  className="hover:text-stone-900 cursor-pointer truncate max-w-40"
                >
                  {humanizeSeat(run.seat).name}
                </button>
                <span className="font-mono text-[11px] text-stone-400 tabular-nums" title={fmtUtcTime(run.at)}>
                  {fmtRelativeTime(run.at, nowMs)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length > 120 && (
          <div className="border-t border-[var(--color-hairline)] bg-stone-50 px-4 py-2 text-center text-xs text-stone-500">
            Showing newest 120 of {fmtNumber(filtered.length)} matching runs in the last hour.
          </div>
        )}
      </div>
    </div>
  );
};
