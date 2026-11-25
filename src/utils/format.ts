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
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';
}

export function campaignDayNumber(startedAt: string | undefined, nowMs = Date.now()): number {
  if (!startedAt) return 1;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 1;
  return Math.max(1, Math.floor((nowMs - start) / 86_400_000) + 1);
}

// Human-friendly metadata for each program
export const PROGRAM_META: Record<
  string,
  {
    shortTitle: string;
    color: string;
    bgSoft: string;
    borderSoft: string;
    textAccent: string;
    pnpBridge: string;
  }
> = {
  meta_complexity: {
    shortTitle: 'Meta-Complexity',
    color: '#B45309',
    bgSoft: '#FFFBEB',
    borderSoft: '#FDE68A',
    textAccent: '#92400E',
    pnpBridge:
      'Maps exact smallest circuits for tiny graphs to uncover patterns that could inspire a general P ≠ NP proof.',
  },
  gct: {
    shortTitle: 'Geometric Complexity',
    color: '#6D28D9',
    bgSoft: '#F5F3FF',
    borderSoft: '#DDD6FE',
    textAccent: '#5B21B6',
    pnpBridge:
      'Uses geometry and algebra to separate two matrix functions (permanent vs. determinant), an algebraic cousin of P ≠ NP.',
  },
  proof_complexity: {
    shortTitle: 'Proof Complexity',
    color: '#0369A1',
    bgSoft: '#F0F9FF',
    borderSoft: '#BAE6FD',
    textAccent: '#075985',
    pnpBridge:
      'Proves that stronger logical proof systems still require exponentially long proofs—a classic stepping stone toward P ≠ NP.',
  },
  circuit_lower_bounds: {
    shortTitle: 'Circuit Lower Bounds',
    color: '#C2410C',
    bgSoft: '#FFF7ED',
    borderSoft: '#FED7AA',
    textAccent: '#9A3412',
    pnpBridge:
      'Directly attacks the 50-year linear barrier: proving SAT requires even slightly more than linear circuit size (n^1.01).',
  },
  p_eq_np_search: {
    shortTitle: 'P = NP Algorithm Search',
    color: '#0F766E',
    bgSoft: '#F0FDFA',
    borderSoft: '#99F6E4',
    textAccent: '#115E59',
    pnpBridge:
      'Takes the opposite side: tests candidate fast SAT algorithms (which would prove P = NP) and records what breaks them.',
  },
  library: {
    shortTitle: 'Core Math Library',
    color: '#4D7C0F',
    bgSoft: '#F7FEE7',
    borderSoft: '#D9F99D',
    textAccent: '#3F6212',
    pnpBridge:
      'Formalizes foundational textbook theorems in Lean so every other research front builds on machine-checked ground.',
  },
  red_team: {
    shortTitle: 'Red Team',
    color: '#B91C1C',
    bgSoft: '#FEF2F2',
    borderSoft: '#FECACA',
    textAccent: '#991B1B',
    pnpBridge:
      'Hunts counterexamples and audits definitions to eliminate false leads quickly.',
  },
  barrier_desk: {
    shortTitle: 'Barrier Desk',
    color: '#475569',
    bgSoft: '#F8FAFC',
    borderSoft: '#CBD5E1',
    textAccent: '#334155',
    pnpBridge:
      'Checks new strategies against famous complexity barriers that blocked past P ≠ NP attempts.',
  },
};

export function programMeta(programId: string) {
  return (
    PROGRAM_META[programId] ?? {
      shortTitle: programId.replace(/_/g, ' '),
      color: '#52525B',
      bgSoft: '#F4F4F5',
      borderSoft: '#E4E4E7',
      textAccent: '#3F3F46',
      pnpBridge: 'Supports the broader attack on P vs NP.',
    }
  );
}

export const AIM_LABELS: Record<ProgramAim, { label: string; className: string }> = {
  p_neq_np: {
    label: 'Aims at P ≠ NP',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  p_eq_np: {
    label: 'Aims at P = NP',
    className: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  neutral: {
    label: 'Foundations / Both',
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
};

export const STATUS_STYLES: Record<
  LemmaStatus,
  { label: string; pill: string; dot: string }
> = {
  checked: {
    label: 'Checked in Lean',
    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  in_work: {
    label: 'In Work',
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  conjecture: {
    label: 'Open Conjecture',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  refuted: {
    label: 'Refuted',
    pill: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-600',
  },
  blocked: {
    label: 'Ruled Dead',
    pill: 'bg-zinc-200 text-zinc-700 border-zinc-300',
    dot: 'bg-zinc-500',
  },
  retired: {
    label: 'Retired',
    pill: 'bg-stone-100 text-stone-500 border-stone-200',
    dot: 'bg-stone-400',
  },
};

export const ATTACK_STATUS_STYLES: Record<
  AttackStatus,
  { label: string; desc: string; pill: string; dot: string }
> = {
  live: {
    label: 'Active Front',
    desc: 'Actively being attacked right now',
    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  support: {
    label: 'Supporting',
    desc: 'Provides checked tools & bounds for active fronts',
    pill: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  stopped: {
    label: 'Stopped / Dead End',
    desc: 'Tested and hit a wall or counterexample',
    pill: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
  },
  dormant: {
    label: 'Dormant',
    desc: 'Parked with partial results on the record',
    pill: 'bg-stone-100 text-stone-600 border-stone-200',
    dot: 'bg-stone-400',
  },
};

// Human-readable directory for cryptic internal seat IDs
interface SeatHumanInfo {
  name: string;
  team: 'Coordination & Ops' | 'Verification & Red Team' | 'Research Programs' | 'Specialists';
  roleSummary: string;
}

const SEAT_DIRECTORY: Record<string, SeatHumanInfo> = {
  'seat-intake-1': {
    name: 'Outside Submissions Intake',
    team: 'Verification & Red Team',
    roleSummary: 'Reviews and checks Lean proofs submitted by external contributor agents.',
  },
  'seat-redteam-1': {
    name: 'Red Team Lead',
    team: 'Verification & Red Team',
    roleSummary: 'Actively tries to refute claims, hunt counterexamples, and audit definitions.',
  },
  'seat-redteam-2': {
    name: 'Red Team Counterexamples',
    team: 'Verification & Red Team',
    roleSummary: 'Stress-tests open conjectures for adversarial counterexamples.',
  },
  'seat-barrier-1': {
    name: 'Complexity Barriers Desk',
    team: 'Verification & Red Team',
    roleSummary: 'Checks proposed proof routes against relativization, natural proofs, and algebrization.',
  },
  'seat-news-1': {
    name: 'Fleet News & Briefings',
    team: 'Coordination & Ops',
    roleSummary: 'Writes plain-English live situation reports and editorial dispatches.',
  },
  'seat-strat-1': {
    name: 'Strategy Coordinator',
    team: 'Coordination & Ops',
    roleSummary: 'Directs research priorities and allocates attention across fronts.',
  },
  'seat-meth-1': {
    name: 'Methodology Desk',
    team: 'Coordination & Ops',
    roleSummary: 'Maintains proof standards and evaluates mathematical methods.',
  },
  'seat-ops-1': {
    name: 'Hub Operations',
    team: 'Coordination & Ops',
    roleSummary: 'Manages fleet scheduling, compute queues, and intake coordination.',
  },
  'seat-site-1': {
    name: 'Public Record Publisher',
    team: 'Coordination & Ops',
    roleSummary: 'Exports verified hub data to the public dashboard.',
  },
  'seat-found-1': {
    name: 'Foundations Seat',
    team: 'Coordination & Ops',
    roleSummary: 'Guards core complexity definitions and shared Lean axioms.',
  },
  'seat-meta-1': {
    name: 'Meta-Complexity Lead',
    team: 'Research Programs',
    roleSummary: 'Leads exact small-circuit tables, plane incidence, and MCSP bounds.',
  },
  'seat-meta-2': {
    name: 'Meta-Complexity Analyst',
    team: 'Research Programs',
    roleSummary: 'Explores exact edge-function circuit sizes and structural reductions.',
  },
  'seat-clb-1': {
    name: 'Circuit Lower Bounds Lead',
    team: 'Research Programs',
    roleSummary: 'Works on turning faster circuit-analysis algorithms into lower bounds.',
  },
  'seat-clb-2': {
    name: 'Circuit Bounds Analyst',
    team: 'Research Programs',
    roleSummary: 'Explores super-linear circuit lower-bound routes for SAT.',
  },
  'seat-pcx-1': {
    name: 'Proof Complexity Lead',
    team: 'Research Programs',
    roleSummary: 'Attacks lower bounds on parity-resolution and algebraic proof systems.',
  },
  'seat-pcx-2': {
    name: 'Proof Systems Analyst',
    team: 'Research Programs',
    roleSummary: 'Tests proof-system refutation length bounds and small-case enumerations.',
  },
  'seat-gct-1': {
    name: 'GCT Lead (Permanent vs Det)',
    team: 'Research Programs',
    roleSummary: 'Explores geometric complexity obstructions and determinantal bounds.',
  },
  'seat-gct-2': {
    name: 'GCT Level-Spaces Analyst',
    team: 'Research Programs',
    roleSummary: 'Investigates level spaces where shifted permanents stay constant.',
  },
  'seat-alg-1': {
    name: 'P = NP Algorithm Search',
    team: 'Research Programs',
    roleSummary: 'Tests candidate fast SAT algorithms against adversarial benchmark families.',
  },
  'seat-lib-1': {
    name: 'Core Library Lead',
    team: 'Research Programs',
    roleSummary: 'Formalizes foundational theorems (Cook-Levin, Ladner, hierarchies) in Lean.',
  },
  'seat-lib-2': {
    name: 'Library Formalizer',
    team: 'Research Programs',
    roleSummary: 'Builds reusable Lean lemmas supporting active research fronts.',
  },
  'seat-rmag-1': {
    name: 'Hardness Magnification',
    team: 'Specialists',
    roleSummary: 'Specialist seat exploring hardness-magnification bridges.',
  },
  'seat-ralg-1': {
    name: 'Algebraic Complexity',
    team: 'Specialists',
    roleSummary: 'Specialist seat on algebraic circuits and polynomial identities.',
  },
  'seat-revade-1': {
    name: 'Barrier Evasion',
    team: 'Specialists',
    roleSummary: 'Specialist seat hunting proof techniques that bypass classic barriers.',
  },
  'seat-rmine-1': {
    name: 'Structure Mining',
    team: 'Specialists',
    roleSummary: 'Mines exact small-circuit tables for patterns and conjecturable laws.',
  },
  'seat-rfrege-1': {
    name: 'Frege Proof Systems',
    team: 'Specialists',
    roleSummary: 'Specialist seat studying bounded-depth and extended Frege systems.',
  },
  'seat-rlift-1': {
    name: 'Lifting Theorems',
    team: 'Specialists',
    roleSummary: 'Specialist seat on query-to-communication and circuit lifting.',
  },
  'seat-rderand-1': {
    name: 'Derandomization',
    team: 'Specialists',
    roleSummary: 'Specialist seat connecting pseudorandomness and circuit lower bounds.',
  },
  'seat-rsat-1': {
    name: 'SAT Search & Synthesis',
    team: 'Specialists',
    roleSummary: 'Runs exact SAT solver searches to establish small-circuit ground truth.',
  },
  'seat-rvnp-1': {
    name: 'VP vs VNP Specialist',
    team: 'Specialists',
    roleSummary: 'Specialist seat on Valiant’s algebraic analogue of P vs NP.',
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
    const cleanTarget = act.target?.replace(/^1 (agents|messages)$/, (_, w) => `1 ${w.slice(0, -1)}`) ?? null;
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
