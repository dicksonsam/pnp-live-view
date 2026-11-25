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
  AtlasSnapshot,
  DrawerView,
  LemmaDetail,
  NewsArticleDetail,
  NewsArticleSummary,
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
  snapshot: AtlasSnapshot;
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
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="animate-drawer-slide relative z-10 flex h-full w-full max-w-2xl flex-col bg-[#0B1220] border-l border-[var(--color-border-bright)] shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-[#0E172A] px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {stack.length > 1 && (
              <button
                type="button"
                onClick={onPop}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-sky-400/50 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-sky-400 truncate">
              {current.kind === 'program' && 'Research Front Deep-Dive'}
              {current.kind === 'lemma' && `Lemma · ${current.lemmaId}`}
              {current.kind === 'seat' && `Orchestrator · ${current.seatId}`}
              {current.kind === 'article' && `Dispatch · ${current.article.id}`}
              {current.kind === 'messages' && 'Raw Inter-Agent Chatter'}
              {current.kind === 'checker' && 'Lean 4 Checker · Last Hour'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
  snapshot: AtlasSnapshot;
  onSelectLemma: (id: string) => void;
  onSelectSeat: (id: string) => void;
}> = ({ programId, snapshot, onSelectLemma, onSelectSeat }) => {
  const prog = snapshot.map.programs.find((p) => p.id === programId);
  const progPlan = snapshot.plan?.programs?.[programId];
  const meta = programMeta(programId);

  if (!prog) return <p className="text-sm text-slate-400">Program not found.</p>;

  const aim = AIM_LABELS[prog.aims_at];
  const attacks = snapshot.map.attack.filter((a) => a.program === programId);
  const seats = snapshot.live.seats.filter((s) => s.program === programId);
  const hard = progPlan?.hard_link;
  const hasHardLink = hard && !/^(none|no |n\/a)/i.test((hard.title ?? '').trim());

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${aim.className}`}>
            {aim.label}
          </span>
          <span className="font-mono text-xs text-slate-400">
            {fmtNumber(prog.counts.checked)} checked · {fmtNumber(prog.counts.refuted)} refuted ·{' '}
            {fmtNumber(prog.counts.conjecture)} open
          </span>
        </div>

        <h2 className="mt-3 font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
          {meta.shortTitle}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{progPlan?.short_name ?? prog.title}</p>

        <div className="mt-3 rounded-xl border border-sky-400/25 bg-sky-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-sky-100">
          <strong className="text-sky-300 font-semibold">How this connects to P vs NP:</strong>{' '}
          {meta.pnpBridge}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {progPlan?.target?.plain ?? prog.goal}
        </p>

        {progPlan?.target?.lemma_id && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Target theorem:</span>
            <button
              type="button"
              onClick={() => onSelectLemma(progPlan.target.lemma_id!)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-medium text-sky-300 hover:border-sky-400/50 cursor-pointer"
            >
              {progPlan.target.lemma_id}
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Bottleneck / Milestone Status */}
      {hard && (
        <div
          className={`rounded-xl border p-4 space-y-2 ${
            hasHardLink
              ? 'border-amber-400/35 bg-amber-500/10'
              : 'border-emerald-400/30 bg-emerald-500/10'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider ${
                hasHardLink ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {hasHardLink ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {hasHardLink ? 'Current Bottleneck (Hard Link)' : 'Milestone Status'}
            </span>
            {hard.lemma_id && (
              <button
                type="button"
                onClick={() => onSelectLemma(hard.lemma_id!)}
                className="font-mono text-xs font-semibold text-amber-200 underline decoration-amber-400/50 cursor-pointer"
              >
                {hard.lemma_id}
              </button>
            )}
          </div>
          {hasHardLink && <p className="text-sm font-semibold text-white">{hard.title}</p>}
          {hard.plain && <p className="text-xs leading-relaxed text-slate-200">{hard.plain}</p>}
          {hard.why_hard && (
            <p className="text-xs leading-relaxed text-slate-300">
              <LinkedText
                text={hard.why_hard}
                map={snapshot.map}
                onSelectLemma={onSelectLemma}
              />
            </p>
          )}
          {hard.attempts_died && hard.attempts_died.length > 0 && (
            <div className="pt-2 mt-2 border-t border-amber-400/20 space-y-1.5">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-300/80">
                Recorded Dead Ends
              </span>
              {hard.attempts_died.map((d, idx) => (
                <p key={idx} className="text-xs text-slate-300 leading-relaxed">
                  <strong className="font-mono text-amber-200">{d.by}:</strong> {d.why_died}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proof Chain */}
      {progPlan?.chain && progPlan.chain.length > 0 && (
        <div>
          <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Proof Chain Milestones ({progPlan.chain.length} steps)
          </h3>
          <ol className="relative border-l-2 border-slate-800 ml-2.5 space-y-3">
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
                    className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-[#0B1220] ${style.dot}`}
                  />
                  <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-3">
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
                          className="font-mono text-xs font-medium text-sky-300 hover:underline cursor-pointer"
                        >
                          {step.lemma_id} →
                        </button>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-200">{cleanTitle}</p>
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
          <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Attack Lines ({attacks.length})
          </h3>
          <div className="space-y-2">
            {attacks.map((a) => {
              const st = ATTACK_STATUS_STYLES[a.status];
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/50 p-3.5"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                  <p className="mt-1.5 text-sm font-semibold text-white">{a.title}</p>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{a.why}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Program Seats */}
      {seats.length > 0 && (
        <div>
          <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
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
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs hover:border-sky-400/50 cursor-pointer"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      act.isWorking ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                  <span className="font-medium text-slate-200">{human.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{s.id}</span>
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
  snapshot: AtlasSnapshot;
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
        if (!res) setError('Lemma ID not found in the published record.');
        else setDetail(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load lemma.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lemmaId, snapshot.map]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
        Loading record for {lemmaId}...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-4 text-sm text-rose-200">
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
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.pill}`}
          >
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            {style.label}
          </span>

          <button
            type="button"
            onClick={() => onSelectProgram(detail.program)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-200 hover:border-sky-400/50 cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pMeta.color }} />
            {pMeta.shortTitle}
          </button>

          <a
            href={`${SITE_BASE}lemma#${detail.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
          >
            Open on pequalnp.com
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <h2 className="mt-3 font-[var(--font-display)] text-xl sm:text-2xl font-bold leading-snug text-white">
          {detail.title}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="font-mono text-sky-300">{detail.id}</span>
          {detail.seat && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => onSelectSeat(detail.seat!)}
                className="hover:text-white underline decoration-slate-600 cursor-pointer"
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

      {detail.plain_statement && (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-4">
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Plain-English Statement
          </h3>
          <p className="text-sm leading-relaxed text-slate-200">
            <LinkedText
              text={detail.plain_statement}
              map={snapshot.map}
              onSelectLemma={onSelectLemma}
            />
          </p>
        </div>
      )}

      {(detail.artifact || detail.contributor) && (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Lean 4 Verification Artifact
          </div>
          {detail.contributor?.github && (
            <div className="flex flex-wrap items-center gap-2 text-slate-200">
              <GitPullRequest className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                Contributed by{' '}
                <a
                  href={`https://github.com/${detail.contributor.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold text-sky-300 hover:underline"
                >
                  @{detail.contributor.github}
                </a>
              </span>
              {detail.contributor.pr_url && (
                <a
                  href={detail.contributor.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-slate-900 border border-emerald-400/30 px-2 py-0.5 text-emerald-300 hover:bg-emerald-500/20"
                >
                  GitHub PR
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          {detail.artifact?.lean_file && (
            <div className="font-mono text-[11px] text-slate-400 break-all">
              {detail.artifact.lean_file}
            </div>
          )}
          {detail.artifact?.runner_url && (
            <a
              href={detail.artifact.runner_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-300 hover:underline"
            >
              Inspect Lean CI Run
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {((detail.depends_on && detail.depends_on.length > 0) ||
        (detail.used_by && detail.used_by.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {detail.depends_on && detail.depends_on.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-3.5">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
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
                      className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-sky-200 hover:border-sky-400/50 cursor-pointer"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${st ? STATUS_STYLES[st].dot : 'bg-slate-400'}`}
                      />
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {detail.used_by && detail.used_by.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-3.5">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
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
                      className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-sky-200 hover:border-sky-400/50 cursor-pointer"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${st ? STATUS_STYLES[st].dot : 'bg-slate-400'}`}
                      />
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {detail.formal_statement && (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFormal((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-200 hover:bg-slate-900 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Code2 className="h-4 w-4 text-sky-400" />
              Formal Lean 4 Statement
            </span>
            {showFormal ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {showFormal && (
            <div className="border-t border-slate-800 p-4 relative bg-[#050810]">
              <button
                type="button"
                onClick={copyFormal}
                className="absolute top-3 right-3 inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <pre className="font-mono text-xs leading-relaxed text-sky-100 whitespace-pre-wrap break-words pr-16">
                {detail.formal_statement}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------- 3. SEAT DETAIL ----------------
const SeatDrawerContent: React.FC<{
  seatId: string;
  snapshot: AtlasSnapshot;
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
        if (active) {
          setDetail(res);
          setLoading(false);
        }
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
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-medium text-sky-300">
            {human.team}
          </span>
          <span className="font-mono">{seatId}</span>
        </div>
        <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold text-white">
          {human.name}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
          {detail?.mandate ?? human.roleSummary}
        </p>

        {act && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                act.isWorking ? 'bg-emerald-400 animate-signal' : 'bg-slate-600'
              }`}
            />
            <span className="font-medium text-slate-200">{act.label}</span>
            {act.since && (
              <span className="text-slate-500">· {fmtRelativeTime(act.since, nowMs)}</span>
            )}
          </div>
        )}
      </div>

      {detail?.counts && (
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-3.5 text-center">
          <div>
            <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
              {fmtNumber(detail.counts.checked)}
            </div>
            <div className="text-[10px] text-slate-400">Checked</div>
          </div>
          <div>
            <div className="font-mono text-lg font-bold text-rose-400 tabular-nums">
              {fmtNumber(detail.counts.refuted)}
            </div>
            <div className="text-[10px] text-slate-400">Refuted</div>
          </div>
          <div>
            <div className="font-mono text-lg font-bold text-slate-200 tabular-nums">
              {fmtNumber(detail.counts.attempts)}
            </div>
            <div className="text-[10px] text-slate-400">Attempts</div>
          </div>
          <div>
            <div className="font-mono text-lg font-bold text-amber-400 tabular-nums">
              {fmtNumber(detail.counts.objections_filed)}
            </div>
            <div className="text-[10px] text-slate-400">Objections</div>
          </div>
        </div>
      )}

      {recentMsgs.length > 0 && (
        <div>
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5">
            Recent Messages ({recentMsgs.length})
          </h3>
          <div className="space-y-2.5">
            {recentMsgs.map((m, idx) => (
              <div
                key={`${m.at}-${idx}`}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => onSelectSeat(m.from)}
                      className="text-sky-300 hover:underline cursor-pointer"
                    >
                      {m.from}
                    </button>
                    <span>→</span>
                    <button
                      type="button"
                      onClick={() => onSelectSeat(m.to)}
                      className="text-sky-300 hover:underline cursor-pointer"
                    >
                      {m.to}
                    </button>
                  </div>
                  <span>
                    {fmtRelativeTime(
                      new Date(Date.parse(m.at) + MESSAGE_PUBLISH_DELAY_MS).toISOString(),
                      nowMs
                    )}
                  </span>
                </div>
                <p className="leading-relaxed text-slate-200">
                  <LinkedText text={m.text} map={snapshot.map} onSelectLemma={onSelectLemma} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
          Loading seat milestone history...
        </div>
      ) : detail?.milestones && detail.milestones.length > 0 ? (
        <div>
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5">
            Recorded Milestones ({detail.milestones.length})
          </h3>
          <div className="space-y-2.5">
            {[...detail.milestones].reverse().slice(0, 8).map((ms) => (
              <div
                key={ms.id}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-3.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-500">{ms.id}</span>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-300">
                    {ms.outcome ?? ms.status}
                  </span>
                </div>
                <p className="font-semibold text-white">{ms.title}</p>
                {ms.conclusion && (
                  <p className="text-slate-300 leading-relaxed">
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
  summary: NewsArticleSummary;
  snapshot: AtlasSnapshot;
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
        if (active) {
          setArticle(res);
          setLoading(false);
        }
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
      <div className="border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pMeta.color }} />
            {pMeta.shortTitle}
          </span>
          <span>·</span>
          <span>{fmtShortDate(summary.published_at)}</span>
        </div>

        <h2 className="mt-2.5 font-[var(--font-display)] text-2xl font-bold leading-tight text-white">
          {summary.title}
        </h2>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">{summary.dek}</p>

        {(summary.author_seat || summary.editor_seat) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
            {summary.author_seat && (
              <button
                type="button"
                onClick={() => onSelectSeat(summary.author_seat!)}
                className="hover:text-sky-300 underline decoration-slate-600 cursor-pointer"
              >
                Written by {humanizeSeat(summary.author_seat).name}
              </button>
            )}
            {summary.editor_seat && (
              <button
                type="button"
                onClick={() => onSelectSeat(summary.editor_seat!)}
                className="hover:text-sky-300 underline decoration-slate-600 cursor-pointer"
              >
                Reviewed by {humanizeSeat(summary.editor_seat).name}
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
          Loading full dispatch...
        </div>
      ) : article?.body ? (
        <div className="space-y-4 text-sm leading-[1.75] text-slate-200">
          {article.body.map((block, idx) =>
            block.h ? (
              <h3 key={idx} className="pt-2 font-[var(--font-display)] text-base font-bold text-white">
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
        <p className="text-sm text-slate-400">Could not load full dispatch text.</p>
      )}
    </article>
  );
};

// ---------------- 5. RAW INTER-AGENT MESSAGES ----------------
const MessagesDrawerContent: React.FC<{
  initialSeat?: string;
  snapshot: AtlasSnapshot;
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
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/70 p-3.5 text-xs text-slate-300 leading-relaxed">
        <strong className="text-white">Unfiltered agent chatter:</strong> Agents speak in conjectures and raw solver runs—<em>only Lean-checked lemmas count as results</em>. Published on a 3-minute delay.{' '}
        {live.not_shown_last_hour ? (
          <span className="text-slate-400">
            ({fmtNumber(live.not_shown_last_hour)} held back by the safety filter in the last hour.)
          </span>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages or lemma IDs..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:border-sky-400/60 focus:outline-none"
          />
        </div>
        <select
          value={seatFilter}
          onChange={(e) => setSeatFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-sky-400/60 focus:outline-none"
        >
          <option value="">All seats ({live.messages.length})</option>
          {activeSeatIds.map((id) => (
            <option key={id} value={id}>
              {humanizeSeat(id).name} ({id})
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">
          <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
          No messages match that filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((m, idx) => (
            <div
              key={`${m.at}-${m.from}-${idx}`}
              className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onSelectSeat(m.from)}
                    className="font-semibold text-sky-300 hover:underline cursor-pointer"
                  >
                    {humanizeSeat(m.from).name}
                  </button>
                  <span className="text-slate-500">→</span>
                  <button
                    type="button"
                    onClick={() => onSelectSeat(m.to)}
                    className="font-semibold text-sky-300 hover:underline cursor-pointer"
                  >
                    {humanizeSeat(m.to).name}
                  </button>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {fmtRelativeTime(
                    new Date(Date.parse(m.at) + MESSAGE_PUBLISH_DELAY_MS).toISOString(),
                    nowMs
                  )}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                <LinkedText text={m.text} map={map} onSelectLemma={onSelectLemma} />
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------- 6. LEAN CHECKER RUNS ----------------
const CheckerDrawerContent: React.FC<{
  initialFilter: 'all' | 'accepted' | 'rejected';
  snapshot: AtlasSnapshot;
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
        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
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
                filter === tab.id ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-44">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter lemma or seat..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:border-sky-400/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-slate-950/60 overflow-hidden">
        <div className="divide-y divide-slate-800/70">
          {filtered.slice(0, 120).map((run, idx) => (
            <div
              key={`${run.at}-${run.lemma_id}-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs hover:bg-slate-900/70 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {run.accepted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => onSelectLemma(run.lemma_id)}
                  className="font-mono font-semibold text-sky-200 hover:underline cursor-pointer"
                >
                  {run.lemma_id}
                </button>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {run.kind === 'refute' ? 'counterexample' : 'proof'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <button
                  type="button"
                  onClick={() => onSelectSeat(run.seat)}
                  className="hover:text-white cursor-pointer truncate max-w-40"
                >
                  {humanizeSeat(run.seat).name}
                </button>
                <span
                  className="font-mono text-[11px] text-slate-500 tabular-nums"
                  title={fmtUtcTime(run.at)}
                >
                  {fmtRelativeTime(run.at, nowMs)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
