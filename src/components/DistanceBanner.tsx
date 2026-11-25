import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Cpu,
  HelpCircle,
  Lock,
  Mountain,
  Sparkles,
} from 'lucide-react';
import { statusOfLemma } from '../api/pnpClient';
import type { HeadData, OverviewMap, PlanData } from '../types/pnp';
import { fmtNumber } from '../utils/format';

interface DistanceBannerProps {
  head: HeadData;
  map: OverviewMap;
  plan: PlanData | null;
  onSelectLemma: (lemmaId: string) => void;
  onSelectProgram: (programId: string) => void;
}

interface LadderRung {
  step: number;
  title: string;
  subtitle: string;
  state: 'done' | 'current' | 'ahead';
  statusTag: string;
  lemmaId?: string;
}

export const DistanceBanner: React.FC<DistanceBannerProps> = ({
  head,
  map,
  plan,
  onSelectLemma,
  onSelectProgram,
}) => {
  const [guideOpen, setGuideOpen] = useState(false);

  const assessment = useMemo(() => {
    const totalChecked = head.counters.checked || 0;
    const metaProg = map.programs.find((p) => p.id === 'meta_complexity');
    const libProg = map.programs.find((p) => p.id === 'library');
    const algProg = map.programs.find((p) => p.id === 'p_eq_np_search');

    const baseCampChecked = (metaProg?.counts.checked ?? 0) + (libProg?.counts.checked ?? 0);
    const baseCampShare =
      totalChecked > 0 ? Math.round((baseCampChecked / totalChecked) * 100) : 0;

    // Live milestone checks against the actual published record
    const restrictedLawChecked = statusOfLemma(map, 'L-meta-1629') === 'checked';
    const linearBarrierBroken = statusOfLemma(map, 'L-clb-036') === 'checked';
    const pEqNpChecked = statusOfLemma(map, 'L-alg-001') === 'checked';
    const breakthrough = head.breakthrough;

    const liveFrontCount = map.attack.filter((a) => a.status === 'live').length;
    const algRefuted = algProg?.counts.refuted ?? 0;
    const algChecked = algProg?.counts.checked ?? 0;

    // Determine current stage on the 5-rung P != NP ladder
    let currentStep = 1;
    if (breakthrough && ['human_reviewed', 'published'].includes(breakthrough.status)) {
      currentStep = 5;
    } else if (breakthrough) {
      currentStep = 4;
    } else if (linearBarrierBroken) {
      currentStep = 4;
    } else if (restrictedLawChecked) {
      currentStep = 3;
    } else {
      currentStep = 1;
    }

    const rungs: LadderRung[] = [
      {
        step: 1,
        title: 'Foundations & Small Tables',
        subtitle: 'Formalize known math & map exact tiny circuits to spot patterns',
        state: currentStep > 1 ? 'done' : 'current',
        statusTag:
          currentStep === 1
            ? `Here now · ${fmtNumber(totalChecked)} checked`
            : 'Completed',
      },
      {
        step: 2,
        title: 'Restricted Circuit Law',
        subtitle: 'Prove a general scaling law for simpler circuits (no NOT gates)',
        state: restrictedLawChecked ? 'done' : currentStep === 2 ? 'current' : 'ahead',
        statusTag: restrictedLawChecked ? 'Checked' : 'Open conjecture',
        lemmaId: 'L-meta-1629',
      },
      {
        step: 3,
        title: 'Break the Linear Barrier',
        subtitle: 'Prove SAT needs > n^1.01 gates — unsolved for 50+ years',
        state: linearBarrierBroken ? 'done' : currentStep === 3 ? 'current' : 'ahead',
        statusTag: linearBarrierBroken ? 'Checked' : 'No known method',
        lemmaId: 'L-clb-036',
      },
      {
        step: 4,
        title: 'Prove P ≠ NP',
        subtitle: 'Super-polynomial bound ruling out every fast algorithm',
        state:
          currentStep === 5 ? 'done' : currentStep === 4 ? 'current' : 'ahead',
        statusTag: breakthrough ? 'Breakthrough posted' : 'Far frontier',
      },
      {
        step: 5,
        title: 'Human Consensus',
        subtitle: 'Independent Lean re-check & mathematician peer review',
        state:
          breakthrough && breakthrough.status === 'published'
            ? 'done'
            : currentStep === 5
            ? 'current'
            : 'ahead',
        statusTag:
          breakthrough && ['human_reviewed', 'published'].includes(breakthrough.status)
            ? breakthrough.status.replace(/_/g, ' ')
            : 'Unreached',
      },
    ];

    let headline = 'Still at Base Camp — far from solving P vs NP.';
    let explanation = `About ${baseCampShare}% of the ${fmtNumber(
      totalChecked
    )} Lean-verified proofs so far are tiny circuit experiments and textbook foundations (${liveFrontCount} active research fronts). No major mathematical barrier toward P ≠ NP has fallen yet, and no fast P = NP algorithm has survived testing.`;

    if (breakthrough) {
      headline = 'A major result has been released — independent verification underway.';
      explanation = breakthrough.claim_plain;
    } else if (pEqNpChecked) {
      headline = 'A P = NP claim has been marked checked on the record.';
      explanation =
        'Inspect L-alg-001 and any official breakthrough notice for verification status.';
    } else if (linearBarrierBroken) {
      headline = 'Major milestone: the 50-year linear circuit barrier (L-clb-036) is marked checked.';
      explanation =
        'Full P ≠ NP still requires super-polynomial lower bounds and independent human review.';
    } else if (restrictedLawChecked) {
      headline = 'Stage 2 reached: a restricted circuit scaling law is checked, but unrestricted barriers remain open.';
      explanation =
        'Moving from restricted AND/OR circuits to unrestricted circuits with NOT gates remains one of the hardest open walls in complexity theory.';
    }

    const clbHard = plan?.programs?.circuit_lower_bounds?.hard_link;

    return {
      headline,
      explanation,
      rungs,
      algRefuted,
      algChecked,
      pEqNpChecked,
      clbHard,
    };
  }, [head, map, plan]);

  return (
    <section
      id="distance"
      aria-label="Distance to solving P vs NP"
      className="scroll-mt-28 rounded-2xl border border-[var(--color-hairline-strong)]/80 bg-white shadow-[0_1px_3px_rgba(24,24,27,0.04)] overflow-hidden"
    >
      {/* Top Headline Band */}
      <div className="p-5 sm:p-6 bg-gradient-to-b from-[var(--color-paper-warm)]/65 to-white">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              <Mountain className="h-3.5 w-3.5 text-amber-700" />
              <span>How Far From Solving P vs NP?</span>
              <span className="text-stone-300">·</span>
              <span className="text-amber-800 normal-case tracking-normal font-medium">
                Live distance check
              </span>
            </div>

            <h2 className="mt-2 font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-ink)] leading-snug">
              {assessment.headline}
            </h2>

            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              {assessment.explanation}
            </p>
          </div>

          {/* Toggle button for the 30-second plain-English guide */}
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            aria-expanded={guideOpen}
            className={`self-start shrink-0 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all cursor-pointer ${
              guideOpen
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-[var(--color-hairline-strong)] bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-400'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>New to P vs NP? (30-sec guide)</span>
            {guideOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Collapsible 30-Second Plain-English Guide */}
        {guideOpen && (
          <div className="mt-5 pt-5 border-t border-[var(--color-hairline)] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-900">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                1. What is P vs NP?
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                Think of a giant Sudoku puzzle. Once someone hands you a completed grid, it’s{' '}
                <strong className="font-medium text-stone-800">easy to check</strong> if it’s right (that’s{' '}
                <strong className="font-medium text-stone-800">NP</strong>). Actually{' '}
                <strong className="font-medium text-stone-800">finding</strong> the solution seems to take slow brute force.{' '}
                <strong className="font-medium text-stone-800">P = NP</strong> asks if there’s a hidden fast shortcut for every easy-to-check problem;{' '}
                <strong className="font-medium text-stone-800">P ≠ NP</strong> says some problems are fundamentally hard forever.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-900">
                <Cpu className="h-3.5 w-3.5 text-amber-700" />
                2. Why tiny graphs &amp; logic gates?
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                Every computer program boils down to logic circuits made of{' '}
                <strong className="font-medium text-stone-800">AND, OR, and NOT gates</strong>. If you can prove a hard problem requires an impossibly huge circuit, you prove no fast algorithm can exist (<strong className="font-medium text-stone-800">P ≠ NP</strong>). Right now, the agents are mapping exact smallest circuits for tiny 6–8 node graphs—like lab experiments—hoping to spot a general mathematical law.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-900">
                <Compass className="h-3.5 w-3.5 text-emerald-700" />
                3. Why 6,000+ proofs ≠ almost done
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                Every single tiny graph entry counts as its own verified proof in Lean 4, alongside hundreds of classic textbook theorems formalized as building blocks. That’s real, rigorous groundwork—but as the fleet itself puts it:{' '}
                <em className="text-stone-800">“Small cases are a table, not a law.”</em> Jumping from finite examples to a universal proof is the true mountain.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5-Rung Climbing Ladder (P != NP) + P = NP Side Track */}
      <div className="border-t border-[var(--color-hairline)] px-5 sm:px-6 py-4 bg-white space-y-3.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold uppercase tracking-[0.11em] text-stone-500">
            The 5-Stage Climb Toward P ≠ NP
          </span>
          <span className="text-stone-400 hidden sm:inline">
            Not a percentage bar — each stage is a real mathematical milestone
          </span>
        </div>

        {/* 5 Horizontal Rungs */}
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {assessment.rungs.map((rung) => {
            const isCurrent = rung.state === 'current';
            const isDone = rung.state === 'done';

            return (
              <li
                key={rung.step}
                className={`relative flex flex-col justify-between rounded-xl border p-3 transition-colors ${
                  isCurrent
                    ? 'border-amber-300 bg-amber-50/55 ring-1 ring-amber-200/70'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-[var(--color-hairline)] bg-[var(--color-paper)]/55'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center justify-center h-5 w-5 rounded-full font-mono text-[11px] font-semibold ${
                        isCurrent
                          ? 'bg-amber-600 text-white'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : rung.step}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCurrent
                          ? 'bg-amber-100 text-amber-900'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {isCurrent && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-live-dot" />
                      )}
                      {rung.statusTag}
                    </span>
                  </div>

                  <h3
                    className={`text-xs font-semibold leading-snug ${
                      isCurrent || isDone ? 'text-stone-900' : 'text-stone-700'
                    }`}
                  >
                    {rung.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                    {rung.subtitle}
                  </p>
                </div>

                {rung.lemmaId && (
                  <div className="mt-2 pt-1.5 border-t border-stone-200/60">
                    <button
                      type="button"
                      onClick={() => onSelectLemma(rung.lemmaId!)}
                      className="font-mono text-[10px] font-medium text-stone-600 hover:text-stone-950 underline decoration-stone-300 underline-offset-2 cursor-pointer"
                    >
                      Track target {rung.lemmaId} →
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* P = NP Opposite Track Summary Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-teal-200/70 bg-teal-50/40 px-3.5 py-2.5 text-xs">
          <div className="flex items-start sm:items-center gap-2 text-stone-700">
            {assessment.pEqNpChecked ? (
              <Sparkles className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <span>
              <strong className="font-semibold text-teal-950">
                Meanwhile, proving P = NP (finding a fast shortcut):
              </strong>{' '}
              {assessment.pEqNpChecked ? (
                <span>Marked checked on the record — inspect L-alg-001.</span>
              ) : (
                <span>
                  Currently <strong className="font-medium text-stone-900">parked at square one</strong> ({assessment.algChecked} survived · {assessment.algRefuted} candidate algorithms failed testing).{' '}
                  <span className="text-stone-500">
                    Under safety rules, any genuine fast algorithm would be held back privately.
                  </span>
                </span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectProgram('p_eq_np_search')}
            className="self-start sm:self-auto shrink-0 font-medium text-teal-800 hover:text-teal-950 underline decoration-teal-300 underline-offset-2 cursor-pointer"
          >
            Inspect front →
          </button>
        </div>
      </div>
    </section>
  );
};
