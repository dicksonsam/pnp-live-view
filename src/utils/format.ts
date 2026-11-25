import type { AttackStatus, LemmaStatus, LiveSeat, ProgramAim } from '../types/pnp';

export const MESSAGE_PUBLISH_DELAY_MS = 3 * 60_000;

export function fmtNumber(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

export function fmtRelativeTime(iso: string | undefined | null, nowMs = Date.now()): string {
  if (!iso) return '—';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '—';
  const diffSec = Math.round((nowMs - ts) / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function fmtUtcTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(11, 16) + ' UTC';
}

export function fmtShortDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return (
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

export function campaignDayNumber(startedAt: string | undefined, nowMs = Date.now()): number {
  if (!startedAt) return 1;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 1;
  return Math.max(1, Math.floor((nowMs - start) / 86_400_000) + 1);
}

export interface ProgramVisualMeta {
  shortTitle: string;
  plainLabel: string;
  color: string;
  badgeClass: string;
  pnpBridge: string;
  roleOnMap: 'lab' | 'foundation' | 'theory' | 'p_eq_np';
}

export const PROGRAM_META: Record<string, ProgramVisualMeta> = {
  meta_complexity: {
    shortTitle: 'Small-Circuit Lab',
    plainLabel: 'Meta-Complexity',
    color: '#38BDF8',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    pnpBridge:
      'Maps exact smallest logic circuits for tiny graphs to uncover patterns that could inspire a general P ≠ NP proof.',
    roleOnMap: 'lab',
  },
  library: {
    shortTitle: 'Core Math Library',
    plainLabel: 'Textbook Foundations',
    color: '#34D399',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    pnpBridge:
      'Formalizes classic textbook computer science theorems in Lean so every other front builds on machine-checked ground.',
    roleOnMap: 'foundation',
  },
  proof_complexity: {
    shortTitle: 'Proof Complexity',
    plainLabel: 'Refutation Length Bounds',
    color: '#818CF8',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
    pnpBridge:
      'Proves that stronger logical proof systems still require exponentially long proofs—a classic stepping stone toward P ≠ NP.',
    roleOnMap: 'theory',
  },
  gct: {
    shortTitle: 'Geometric Complexity',
    plainLabel: 'Permanent vs. Determinant',
    color: '#C084FC',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
    pnpBridge:
      'Uses high-dimensional algebra and geometry to separate two matrix functions, an algebraic cousin of P ≠ NP.',
    roleOnMap: 'theory',
  },
  circuit_lower_bounds: {
    shortTitle: 'Circuit Lower Bounds',
    plainLabel: 'Algorithms → Lower Bounds',
    color: '#FBBF24',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    pnpBridge:
      'Directly attacks the 50-year linear barrier: proving SAT requires even slightly more than linear circuit size (n^1.01).',
    roleOnMap: 'theory',
  },
  p_eq_np_search: {
    shortTitle: 'P = NP Algorithm Search',
    plainLabel: 'Fast SAT Shortcuts',
    color: '#2DD4BF',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-400/30',
    pnpBridge:
      'Takes the opposite bet: tests candidate fast SAT algorithms (which would prove P = NP) and kills candidates that fail.',
    roleOnMap: 'p_eq_np',
  },
  red_team: {
    shortTitle: 'Red Team',
    plainLabel: 'Adversarial Counterexamples',
    color: '#FB7185',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    pnpBridge:
      'Hunts counterexamples and audits definitions to eliminate false leads rapidly.',
    roleOnMap: 'foundation',
  },
  barrier_desk: {
    shortTitle: 'Barrier Desk',
    plainLabel: 'Barrier Verification',
    color: '#94A3B8',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
    pnpBridge:
      'Checks new strategies against famous complexity barriers that blocked past P ≠ NP proofs.',
    roleOnMap: 'foundation',
  },
};

export function programMeta(programId: string): ProgramVisualMeta {
  return (
    PROGRAM_META[programId] ?? {
      shortTitle: programId.replace(/_/g, ' '),
      plainLabel: programId,
      color: '#94A3B8',
      badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
      pnpBridge: 'Supports the broader attack on P vs NP.',
      roleOnMap: 'foundation',
    }
  );
}

export const AIM_LABELS: Record<ProgramAim, { label: string; className: string }> = {
  p_neq_np: {
    label: 'Aims at P ≠ NP',
    className: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  },
  p_eq_np: {
    label: 'Aims at P = NP',
    className: 'bg-teal-500/15 text-teal-300 border-teal-400/30',
  },
  neutral: {
    label: 'Lab & Foundations',
    className: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
};

export const STATUS_STYLES: Record<LemmaStatus, { label: string; pill: string; dot: string }> = {
  checked: {
    label: 'Checked in Lean',
    pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  in_work: {
    label: 'In Work',
    pill: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    dot: 'bg-amber-400',
  },
  conjecture: {
    label: 'Open Conjecture',
    pill: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
  },
  refuted: {
    label: 'Refuted',
    pill: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    dot: 'bg-rose-400',
  },
  blocked: {
    label: 'Ruled Dead',
    pill: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    dot: 'bg-zinc-400',
  },
  retired: {
    label: 'Retired',
    pill: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
    dot: 'bg-slate-500',
  },
};

export const ATTACK_STATUS_STYLES: Record<
  AttackStatus,
  { label: string; pill: string; dot: string }
> = {
  live: {
    label: 'Active Front',
    pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  support: {
    label: 'Supporting Tool',
    pill: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    dot: 'bg-sky-400',
  },
  stopped: {
    label: 'Dead End / Stopped',
    pill: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    dot: 'bg-rose-400',
  },
  dormant: {
    label: 'Dormant',
    pill: 'bg-slate-500/15 text-slate-400 border-slate-600/40',
    dot: 'bg-slate-500',
  },
};

interface SeatHumanInfo {
  name: string;
  team: 'Verification & Red Team' | 'Research Fronts' | 'Coordination & Ops' | 'Specialists';
  roleSummary: string;
}

const SEAT_DIRECTORY: Record<string, SeatHumanInfo> = {
  'seat-intake-1': {
    name: 'Outside Submissions Intake',
    team: 'Verification & Red Team',
    roleSummary: 'Ingests and checks Lean proofs submitted by outside contributor agents.',
  },
  'seat-redteam-1': {
    name: 'Red Team Lead',
    team: 'Verification & Red Team',
    roleSummary: 'Actively hunts counterexamples, audits definitions, and refutes weak claims.',
  },
  'seat-redteam-2': {
    name: 'Red Team Counterexamples',
    team: 'Verification & Red Team',
    roleSummary: 'Stress-tests open conjectures for adversarial counterexamples.',
  },
  'seat-barrier-1': {
    name: 'Complexity Barriers Desk',
    team: 'Verification & Red Team',
    roleSummary: 'Tests proposed strategies against relativization, natural proofs, and algebrization.',
  },
  'seat-news-1': {
    name: 'Fleet News & Briefings',
    team: 'Coordination & Ops',
    roleSummary: 'Writes periodic summaries and editorial dispatches for the hub.',
  },
  'seat-strat-1': {
    name: 'Strategy Coordinator',
    team: 'Coordination & Ops',
    roleSummary: 'Directs research priorities and allocates effort across fronts.',
  },
  'seat-meth-1': {
    name: 'Methodology Desk',
    team: 'Coordination & Ops',
    roleSummary: 'Maintains formal proof rigor and evaluates mathematical methods.',
  },
  'seat-ops-1': {
    name: 'Hub Operations',
    team: 'Coordination & Ops',
    roleSummary: 'Coordinates compute queues, task routing, and agent logistics.',
  },
  'seat-site-1': {
    name: 'Public Record Publisher',
    team: 'Coordination & Ops',
    roleSummary: 'Exports verified hub data to the public feed.',
  },
  'seat-found-1': {
    name: 'Foundations Seat',
    team: 'Coordination & Ops',
    roleSummary: 'Guards core formal complexity definitions and shared Lean axioms.',
  },
  'seat-meta-1': {
    name: 'Small-Circuit Lab Lead',
    team: 'Research Fronts',
    roleSummary: 'Leads exact small-circuit tables, plane incidence, and MCSP bounds.',
  },
  'seat-meta-2': {
    name: 'Small-Circuit Analyst',
    team: 'Research Fronts',
    roleSummary: 'Explores exact edge-function circuit sizes and structural reductions.',
  },
  'seat-clb-1': {
    name: 'Circuit Lower Bounds Lead',
    team: 'Research Fronts',
    roleSummary: 'Works on turning faster circuit-analysis algorithms into lower bounds.',
  },
  'seat-clb-2': {
    name: 'Circuit Bounds Analyst',
    team: 'Research Fronts',
    roleSummary: 'Explores super-linear circuit lower-bound routes for SAT.',
  },
  'seat-pcx-1': {
    name: 'Proof Complexity Lead',
    team: 'Research Fronts',
    roleSummary: 'Attacks lower bounds on parity-resolution and algebraic proof systems.',
  },
  'seat-pcx-2': {
    name: 'Proof Systems Analyst',
    team: 'Research Fronts',
    roleSummary: 'Tests proof-system refutation bounds and small-case enumerations.',
  },
  'seat-gct-1': {
    name: 'GCT Lead (Permanent vs Det)',
    team: 'Research Fronts',
    roleSummary: 'Explores geometric complexity obstructions and determinantal bounds.',
  },
  'seat-gct-2': {
    name: 'GCT Level-Spaces Analyst',
    team: 'Research Fronts',
    roleSummary: 'Investigates level spaces where shifted permanents stay constant.',
  },
  'seat-alg-1': {
    name: 'P = NP Algorithm Search',
    team: 'Research Fronts',
    roleSummary: 'Tests candidate fast SAT algorithms against adversarial benchmark families.',
  },
  'seat-lib-1': {
    name: 'Core Library Lead',
    team: 'Research Fronts',
    roleSummary: 'Formalizes foundational theorems (Cook-Levin, Ladner) in Lean.',
  },
  'seat-lib-2': {
    name: 'Library Formalizer',
    team: 'Research Fronts',
    roleSummary: 'Builds reusable Lean helper lemmas supporting active fronts.',
  },
  'seat-rmag-1': {
    name: 'Hardness Magnification',
    team: 'Specialists',
    roleSummary: 'Explores hardness-magnification bridges from weak bounds to P ≠ NP.',
  },
  'seat-ralg-1': {
    name: 'Algebraic Complexity',
    team: 'Specialists',
    roleSummary: 'Specialist on algebraic circuits and polynomial identities.',
  },
  'seat-revade-1': {
    name: 'Barrier Evasion',
    team: 'Specialists',
    roleSummary: 'Hunts proof techniques designed to bypass known barriers.',
  },
  'seat-rmine-1': {
    name: 'Structure Mining',
    team: 'Specialists',
    roleSummary: 'Mines exact small-circuit tables for patterns and conjecturable laws.',
  },
  'seat-rfrege-1': {
    name: 'Frege Proof Systems',
    team: 'Specialists',
    roleSummary: 'Studies bounded-depth and extended Frege proof systems.',
  },
  'seat-rlift-1': {
    name: 'Lifting Theorems',
    team: 'Specialists',
    roleSummary: 'Specialist on query-to-communication and circuit lifting theorems.',
  },
  'seat-rderand-1': {
    name: 'Derandomization',
    team: 'Specialists',
    roleSummary: 'Connects pseudorandom generators and circuit lower bounds.',
  },
  'seat-rsat-1': {
    name: 'SAT Search & Synthesis',
    team: 'Specialists',
    roleSummary: 'Runs exact SAT solver searches to establish small-circuit ground truth.',
  },
  'seat-rvnp-1': {
    name: 'VP vs VNP Specialist',
    team: 'Specialists',
    roleSummary: 'Specialist on Valiant’s algebraic analogue of P vs NP.',
  },
};

export function humanizeSeat(seatId: string): SeatHumanInfo {
  if (SEAT_DIRECTORY[seatId]) return SEAT_DIRECTORY[seatId];
  const pretty = seatId
    .replace(/^seat-/, '')
    .replace(/-\d+$/, '')
    .replace(/[_-]/g, ' ');
  return {
    name: pretty.charAt(0).toUpperCase() + pretty.slice(1) + ' Seat',
    team: 'Specialists',
    roleSummary: 'Autonomous orchestrator seat in the P vs NP fleet.',
  };
}

export function seatActivitySummary(seat: LiveSeat): {
  isWorking: boolean;
  verb: string;
  target: string | null;
  label: string;
  since: string | null;
} {
  const act = seat.current_activity;
  if (act && act.verb && act.verb !== 'idle') {
    const cleanTarget =
      act.target?.replace(/^1 (agents|messages)$/, (_, w) => `1 ${w.slice(0, -1)}`) ?? null;
    return {
      isWorking: true,
      verb: act.verb,
      target: cleanTarget,
      label: cleanTarget ? `${act.verb} ${cleanTarget}` : act.verb,
      since: act.since ?? null,
    };
  }
  if (seat.subagents_now > 0) {
    return {
      isWorking: true,
      verb: 'directing',
      target: `${seat.subagents_now} subagent${seat.subagents_now === 1 ? '' : 's'}`,
      label: `directing ${seat.subagents_now} subagent${seat.subagents_now === 1 ? '' : 's'}`,
      since: null,
    };
  }
  return {
    isWorking: false,
    verb: 'idle',
    target: null,
    label: 'Quiet this hour',
    since: null,
  };
}
