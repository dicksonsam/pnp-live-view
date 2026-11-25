import React, { useMemo, useState } from 'react';
import { Lock, Map as MapIcon, ShieldAlert, Sparkles } from 'lucide-react';
import { statusOfLemma } from '../api/pnpClient';
import type { HeadData, LiveData, OverviewMap } from '../types/pnp';
import { fmtNumber, seatActivitySummary } from '../utils/format';

interface BreakthroughMapProps {
  head: HeadData;
  live: LiveData;
  map: OverviewMap;
  onSelectProgram: (programId: string) => void;
  onSelectLemma: (lemmaId: string) => void;
}

export const BreakthroughMap: React.FC<BreakthroughMapProps> = ({
  head,
  live,
  map,
  onSelectProgram,
  onSelectLemma,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const stats = useMemo(() => {
    const byId = new Map(map.programs.map((p) => [p.id, p]));
    const activeSeatsByProg = new Map<string, number>();
    for (const s of live.seats) {
      if (seatActivitySummary(s).isWorking) {
        activeSeatsByProg.set(s.program, (activeSeatsByProg.get(s.program) ?? 0) + 1);
      }
    }
    const liveAttacksByProg = new Map<string, number>();
    for (const a of map.attack) {
      if (a.status === 'live') {
        liveAttacksByProg.set(a.program, (liveAttacksByProg.get(a.program) ?? 0) + 1);
      }
    }

    const linearBroken = statusOfLemma(map, 'L-clb-036') === 'checked';
    const restrictedBroken = statusOfLemma(map, 'L-meta-1629') === 'checked';
    const pEqNpChecked = statusOfLemma(map, 'L-alg-001') === 'checked';

    return {
      byId,
      activeSeatsByProg,
      liveAttacksByProg,
      linearBroken,
      restrictedBroken,
      pEqNpChecked,
    };
  }, [map, live.seats]);

  const countOf = (id: string) => stats.byId.get(id)?.counts.checked ?? 0;
  const refutedOf = (id: string) => stats.byId.get(id)?.counts.refuted ?? 0;
  const activeSeatsOf = (id: string) => stats.activeSeatsByProg.get(id) ?? 0;
  const liveFrontsOf = (id: string) => stats.liveAttacksByProg.get(id) ?? 0;

  const isPathHot = (nodeIds: string[]) =>
    hoveredNode !== null && nodeIds.includes(hoveredNode);

  return (
    <section
      id="atlas-map"
      className="scroll-mt-28 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel)]/90 p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-sky-400">
            <MapIcon className="h-3.5 w-3.5" />
            Interactive Architecture Map
          </div>
          <h2 className="mt-1 font-[var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-white">
            How P vs NP Could Actually Be Solved
          </h2>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Every active research front maps onto one of two possible endings: climbing through the{' '}
            <strong className="text-amber-300 font-medium">50-year barrier wall</strong> to prove{' '}
            <strong className="text-indigo-300 font-medium">P ≠ NP</strong>, or finding a single fast shortcut to prove{' '}
            <strong className="text-teal-300 font-medium">P = NP</strong>. Click any node to inspect its live proof chain.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-signal" />
            Active now
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Solid ground
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Unbroken wall
          </span>
        </div>
      </div>

      {/* Desktop / Tablet Interactive SVG Blueprint Map */}
      <div className="hidden md:block overflow-x-auto">
        <svg
          viewBox="0 0 1120 470"
          className="w-full h-auto min-w-[820px] select-none"
          role="img"
          aria-label="Visual map of the six research fronts, complexity barriers, and paths to P != NP or P = NP"
        >
          <defs>
            <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#EF4444" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="hotFlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.85" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Column Stage Headers */}
          <g fontFamily="JetBrains Mono, monospace" fontSize="10.5" fill="#64748B" letterSpacing="1.2">
            <text x="130" y="22" textAnchor="middle">STAGE 1 · BASE CAMP (NOW)</text>
            <text x="435" y="22" textAnchor="middle">STAGE 2 · THEORY FRONTS</text>
            <text x="725" y="22" textAnchor="middle" fill="#FBBF24">STAGE 3 · THE 50-YR WALL</text>
            <text x="980" y="22" textAnchor="middle">STAGE 4–5 · SUMMITS</text>
          </g>

          {/* Subtle vertical column dividers */}
          <line x1="278" y1="36" x2="278" y2="452" stroke="#1E293B" strokeDasharray="4 6" />
          <line x1="600" y1="36" x2="600" y2="452" stroke="#1E293B" strokeDasharray="4 6" />
          <line x1="850" y1="36" x2="850" y2="452" stroke="#1E293B" strokeDasharray="4 6" />

          {/* Connecting Flow Paths: Stage 1 -> Stage 2 */}
          <g fill="none" strokeWidth="2">
            {/* Small-Circuit Lab -> Circuit Lower Bounds (primary active hope) */}
            <path
              d="M 248 128 C 288 128, 285 95, 322 95"
              stroke={isPathHot(['meta_complexity', 'circuit_lower_bounds']) ? '#38BDF8' : 'url(#hotFlow)'}
              strokeOpacity={isPathHot(['meta_complexity', 'circuit_lower_bounds']) ? 1 : 0.7}
              className="animate-flow"
            />
            {/* Small-Circuit Lab -> Proof Complexity */}
            <path
              d="M 248 148 C 292 148, 288 205, 322 205"
              stroke={isPathHot(['meta_complexity', 'proof_complexity']) ? '#38BDF8' : '#334155'}
              strokeWidth={isPathHot(['meta_complexity', 'proof_complexity']) ? 2.5 : 1.75}
              className="animate-flow"
            />
            {/* Library -> all 3 theory fronts */}
            <path
              d="M 248 272 C 292 272, 286 112, 322 112"
              stroke={isPathHot(['library', 'circuit_lower_bounds']) ? '#34D399' : '#1E3A5F'}
              strokeWidth="1.5"
            />
            <path
              d="M 248 282 C 288 282, 290 220, 322 220"
              stroke={isPathHot(['library', 'proof_complexity']) ? '#34D399' : '#1E3A5F'}
              strokeWidth="1.5"
            />
            <path
              d="M 248 292 C 288 292, 290 315, 322 315"
              stroke={isPathHot(['library', 'gct']) ? '#34D399' : '#1E3A5F'}
              strokeWidth="1.5"
            />
          </g>

          {/* Connecting Paths: Stage 2 -> Barrier Wall -> P != NP Summit */}
          <g fill="none" strokeWidth="1.75" strokeDasharray="5 6">
            <path
              d="M 552 98 L 642 135"
              stroke={isPathHot(['circuit_lower_bounds', 'barrier']) ? '#FBBF24' : '#475569'}
            />
            <path
              d="M 552 208 L 642 208"
              stroke={isPathHot(['proof_complexity', 'barrier']) ? '#818CF8' : '#475569'}
            />
            <path
              d="M 552 315 L 642 272"
              stroke={isPathHot(['gct', 'barrier']) ? '#C084FC' : '#475569'}
            />
            {/* Through Wall -> P != NP (locked dashed) */}
            <path
              d="M 812 195 L 882 162"
              stroke={stats.linearBroken ? '#34D399' : '#64748B'}
              strokeWidth={stats.linearBroken ? 2.5 : 1.5}
              strokeDasharray={stats.linearBroken ? undefined : '3 6'}
            />
          </g>

          {/* Bottom Bypass Path: P = NP Algorithm Search -> P = NP Summit (bypasses wall!) */}
          <g fill="none">
            <path
              d="M 552 405 L 882 390"
              stroke={isPathHot(['p_eq_np_search']) ? '#2DD4BF' : '#1F4B4B'}
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <rect x="576" y="408" width="282" height="22" rx="6" fill="#0B1322" stroke="#164E63" strokeWidth="1" />
            <text
              x="717"
              y="422.5"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9.5"
              fill="#5EEAD4"
            >
              BYPASSES WALL IF ONE FAST ALGORITHM EXISTS
            </text>
          </g>

          {/* ================= STAGE 1 NODES ================= */}
          {/* Node 1A: Small-Circuit Lab (Meta-Complexity) — HOTTEST ACTIVE NODE */}
          <g
            transform="translate(18, 60)"
            className="cursor-pointer"
            onClick={() => onSelectProgram('meta_complexity')}
            onMouseEnter={() => setHoveredNode('meta_complexity')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="230"
              height="136"
              rx="14"
              fill="#0E1D34"
              stroke={hoveredNode === 'meta_complexity' ? '#7DD3FC' : '#38BDF8'}
              strokeWidth="2"
              filter="url(#softGlow)"
            />
            <rect x="14" y="14" width="112" height="20" rx="10" fill="#0369A1" fillOpacity="0.45" />
            <circle cx="25" cy="24" r="3.5" fill="#38BDF8" className="animate-signal" />
            <text x="34" y="27.5" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#BAE6FD" fontWeight="600">
              ACTIVE · {liveFrontsOf('meta_complexity')} FRONTS
            </text>

            <text x="14" y="56" fontFamily="Space Grotesk, sans-serif" fontSize="16" fontWeight="700" fill="#FFFFFF">
              Small-Circuit Lab
            </text>
            <text x="14" y="75" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11.5" fill="#94A3B8">
              Exact tiny 6–8 node circuit tables
            </text>
            <text x="14" y="91" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11.5" fill="#94A3B8">
              hunting for a general scaling law.
            </text>

            <line x1="14" y1="106" x2="216" y2="106" stroke="#1E3A5F" />
            <text x="14" y="124" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#34D399" fontWeight="600">
              {fmtNumber(countOf('meta_complexity'))} checked
            </text>
            <text x="216" y="124" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10.5" fill="#7DD3FC">
              Inspect →
            </text>
          </g>

          {/* Node 1B: Core Math Library */}
          <g
            transform="translate(18, 224)"
            className="cursor-pointer"
            onClick={() => onSelectProgram('library')}
            onMouseEnter={() => setHoveredNode('library')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="230"
              height="118"
              rx="14"
              fill="#0E1928"
              stroke={hoveredNode === 'library' ? '#6EE7B7' : '#1E463B'}
              strokeWidth="1.5"
            />
            <rect x="14" y="14" width="96" height="19" rx="9.5" fill="#065F46" fillOpacity="0.45" />
            <text x="24" y="27" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#6EE7B7" fontWeight="600">
              TARGET CHECKED
            </text>
            <text x="14" y="53" fontFamily="Space Grotesk, sans-serif" fontSize="15" fontWeight="700" fill="#F8FAFC">
              Core Math Library
            </text>
            <text x="14" y="72" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#94A3B8">
              Classic theorems (Cook-Levin, Ladner)
            </text>
            <line x1="14" y1="88" x2="216" y2="88" stroke="#1D2B44" />
            <text x="14" y="106" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#34D399">
              {fmtNumber(countOf('library'))} checked
            </text>
            <text x="216" y="106" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">
              Inspect →
            </text>
          </g>

          {/* ================= STAGE 2 NODES ================= */}
          {/* Node 2A: Circuit Lower Bounds */}
          <g
            transform="translate(322, 52)"
            className="cursor-pointer"
            onClick={() => onSelectProgram('circuit_lower_bounds')}
            onMouseEnter={() => setHoveredNode('circuit_lower_bounds')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="230"
              height="94"
              rx="13"
              fill="#121A2C"
              stroke={hoveredNode === 'circuit_lower_bounds' ? '#FCD34D' : '#2D3E5E'}
              strokeWidth="1.5"
            />
            <circle cx="24" cy="24" r="4" fill="#FBBF24" />
            <text x="35" y="28" fontFamily="Space Grotesk, sans-serif" fontSize="14.5" fontWeight="700" fill="#F8FAFC">
              Circuit Lower Bounds
            </text>
            <text x="14" y="48" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#94A3B8">
              Direct attack on n^1.01 gate barrier
            </text>
            <text x="14" y="76" fontFamily="JetBrains Mono, monospace" fontSize="10.5" fill="#CBD5E1">
              {fmtNumber(countOf('circuit_lower_bounds'))} checked ·{' '}
              <tspan fill={activeSeatsOf('circuit_lower_bounds') > 0 ? '#FBBF24' : '#64748B'}>
                {activeSeatsOf('circuit_lower_bounds') > 0
                  ? `${activeSeatsOf('circuit_lower_bounds')} active`
                  : 'quiet'}
              </tspan>
            </text>
            <text x="216" y="76" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">
              →
            </text>
          </g>

          {/* Node 2B: Proof Complexity */}
          <g
            transform="translate(322, 162)"
            className="cursor-pointer"
            onClick={() => onSelectProgram('proof_complexity')}
            onMouseEnter={() => setHoveredNode('proof_complexity')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="230"
              height="94"
              rx="13"
              fill="#121A2C"
              stroke={hoveredNode === 'proof_complexity' ? '#A5B4FC' : '#2D3E5E'}
              strokeWidth="1.5"
            />
            <circle cx="24" cy="24" r="4" fill="#818CF8" />
            <text x="35" y="28" fontFamily="Space Grotesk, sans-serif" fontSize="14.5" fontWeight="700" fill="#F8FAFC">
              Proof Complexity
            </text>
            <text x="14" y="48" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#94A3B8">
              Proving logic systems need huge proofs
            </text>
            <text x="14" y="76" fontFamily="JetBrains Mono, monospace" fontSize="10.5" fill="#CBD5E1">
              {fmtNumber(countOf('proof_complexity'))} checked ·{' '}
              <tspan fill={activeSeatsOf('proof_complexity') > 0 ? '#818CF8' : '#64748B'}>
                {activeSeatsOf('proof_complexity') > 0
                  ? `${activeSeatsOf('proof_complexity')} active`
                  : 'parked'}
              </tspan>
            </text>
            <text x="216" y="76" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">
              →
            </text>
          </g>

          {/* Node 2C: Geometric Complexity (GCT) */}
          <g
            transform="translate(322, 272)"
            className="cursor-pointer"
            onClick={() => onSelectProgram('gct')}
            onMouseEnter={() => setHoveredNode('gct')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="230"
              height="94"
              rx="13"
              fill="#121A2C"
              stroke={hoveredNode === 'gct' ? '#D8B4FE' : '#2D3E5E'}
              strokeWidth="1.5"
            />
            <circle cx="24" cy="24" r="4" fill="#C084FC" />
            <text x="35" y="28" fontFamily="Space Grotesk, sans-serif" fontSize="14.5" fontWeight="700" fill="#F8FAFC">
              Geometric Complexity
            </text>
            <text x="14" y="48" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#94A3B8">
              Permanent vs. determinant (algebraic)
            </text>
            <text x="14" y="76" fontFamily="JetBrains Mono, monospace" fontSize="10.5" fill="#CBD5E1">
              {fmtNumber(countOf('gct'))} checked ·{' '}
              <tspan fill={activeSeatsOf('gct') > 0 ? '#C084FC' : '#64748B'}>
                {activeSeatsOf('gct') > 0 ? `${activeSeatsOf('gct')} active` : 'dormant'}
              </tspan>
            </text>
            <text x="216" y="76" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#94A3B8">
              →
            </text>
          </g>

          {/* Node 2D (Bottom Bypass): P = NP Algorithm Search */}
          <g
            transform="translate(322, 382)"
            className="cursor-pointer"
            onClick={() => onSelectProgram('p_eq_np_search')}
            onMouseEnter={() => setHoveredNode('p_eq_np_search')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="230"
              height="74"
              rx="13"
              fill="#0C1F24"
              stroke={hoveredNode === 'p_eq_np_search' ? '#5EEAD4' : '#1E4E52'}
              strokeWidth="1.5"
            />
            <circle cx="24" cy="24" r="4" fill="#2DD4BF" />
            <text x="35" y="28" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="700" fill="#CCFBF1">
              P = NP Algorithm Search
            </text>
            <text x="14" y="54" fontFamily="JetBrains Mono, monospace" fontSize="10.5" fill="#99F6E4">
              {countOf('p_eq_np_search')} survived ·{' '}
              <tspan fill="#FB7185">{refutedOf('p_eq_np_search')} killed</tspan>
            </text>
            <text x="216" y="54" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#5EEAD4">
              →
            </text>
          </g>

          {/* ================= STAGE 3: THE GREAT 50-YEAR BARRIER WALL ================= */}
          <g
            transform="translate(642, 62)"
            className="cursor-pointer"
            onClick={() => onSelectLemma('L-clb-036')}
            onMouseEnter={() => setHoveredNode('barrier')}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <rect
              width="170"
              height="294"
              rx="16"
              fill="url(#wallGrad)"
              stroke={hoveredNode === 'barrier' ? '#FDE047' : '#F59E0B'}
              strokeWidth="1.75"
              strokeDasharray={stats.linearBroken ? undefined : '6 4'}
            />
            <text x="85" y="34" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#FDE68A" fontWeight="700">
              {stats.linearBroken ? 'BARRIER BREACHED' : 'LOCKED BARRIER'}
            </text>
            <text x="85" y="58" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize="15.5" fontWeight="700" fill="#FFFFFF">
              The 50-Year Wall
            </text>

            {/* Target Gate Box */}
            <rect x="14" y="76" width="142" height="72" rx="10" fill="#0B1120" fillOpacity="0.82" stroke="#F59E0B" strokeOpacity="0.45" />
            <text x="85" y="96" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#FBBF24">
              GATE · L-clb-036
            </text>
            <text x="85" y="114" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#F1F5F9" fontWeight="600">
              SAT needs &gt; n^1.01
            </text>
            <text x="85" y="132" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10.5" fill="#94A3B8">
              {stats.linearBroken ? 'Checked in Lean!' : 'No known method yet'}
            </text>

            {/* Three Famous Complexity Barriers */}
            <text x="85" y="175" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#FCA5A5">
              MUST BYPASS ALL 3:
            </text>
            <rect x="20" y="187" width="130" height="24" rx="6" fill="#0F172A" fillOpacity="0.8" />
            <text x="85" y="203" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#E2E8F0">
              1. Relativization
            </text>
            <rect x="20" y="218" width="130" height="24" rx="6" fill="#0F172A" fillOpacity="0.8" />
            <text x="85" y="234" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#E2E8F0">
              2. Natural Proofs
            </text>
            <rect x="20" y="249" width="130" height="24" rx="6" fill="#0F172A" fillOpacity="0.8" />
            <text x="85" y="265" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fill="#E2E8F0">
              3. Algebrization
            </text>
          </g>

          {/* ================= STAGE 4–5: THE TWO SUMMITS ================= */}
          {/* Summit A: P != NP */}
          <g transform="translate(882, 84)">
            <rect
              width="218"
              height="168"
              rx="16"
              fill="#0E1428"
              stroke={head.breakthrough ? '#34D399' : '#312E81'}
              strokeWidth="2"
            />
            <rect x="16" y="16" width="96" height="20" rx="10" fill="#1E1B4B" />
            <text x="64" y="29.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#A5B4FC" fontWeight="600">
              {head.breakthrough ? 'ACTIVE REVIEW' : 'UNREACHED'}
            </text>
            <text x="16" y="64" fontFamily="Space Grotesk, sans-serif" fontSize="24" fontWeight="700" fill="#FFFFFF">
              P ≠ NP
            </text>
            <text x="16" y="86" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11.5" fill="#94A3B8">
              Prove no fast algorithm or
            </text>
            <text x="16" y="102" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11.5" fill="#94A3B8">
              polynomial circuit can exist.
            </text>
            <line x1="16" y1="120" x2="202" y2="120" stroke="#1E293B" />
            <text x="16" y="140" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#64748B">
              + Independent human peer
            </text>
            <text x="16" y="155" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#64748B">
              review &amp; Lean re-check
            </text>
          </g>

          {/* Summit B: P = NP */}
          <g transform="translate(882, 326)">
            <rect
              width="218"
              height="128"
              rx="16"
              fill="#0A1B1F"
              stroke={stats.pEqNpChecked ? '#2DD4BF' : '#164E63'}
              strokeWidth="1.75"
            />
            <rect x="16" y="14" width="118" height="19" rx="9.5" fill="#134E4A" fillOpacity="0.6" />
            <text x="75" y="27" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#5EEAD4" fontWeight="600">
              {stats.pEqNpChecked ? 'CHECKED' : 'HELD IF FOUND'}
            </text>
            <text x="16" y="60" fontFamily="Space Grotesk, sans-serif" fontSize="22" fontWeight="700" fill="#FFFFFF">
              P = NP
            </text>
            <text x="16" y="82" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11.5" fill="#94A3B8">
              Find just ONE fast algorithm
            </text>
            <text x="16" y="98" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11.5" fill="#94A3B8">
              solving SAT for all inputs.
            </text>
          </g>
        </svg>
      </div>

      {/* Mobile Compact Vertical Path Fallback */}
      <div className="md:hidden space-y-3">
        <div className="rounded-xl border border-sky-400/50 bg-sky-950/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
            Stage 1 · Active Base Camp Now
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => onSelectProgram('meta_complexity')}
              className="flex items-center justify-between rounded-lg bg-slate-900/80 border border-sky-400/30 px-3 py-2.5 text-left"
            >
              <div>
                <div className="text-sm font-semibold text-white">Small-Circuit Lab</div>
                <div className="text-xs text-slate-400">{fmtNumber(countOf('meta_complexity'))} checked · {liveFrontsOf('meta_complexity')} live fronts</div>
              </div>
              <span className="font-mono text-xs text-sky-300">Inspect →</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectProgram('library')}
              className="flex items-center justify-between rounded-lg bg-slate-900/80 border border-emerald-400/25 px-3 py-2.5 text-left"
            >
              <div>
                <div className="text-sm font-semibold text-white">Core Math Library</div>
                <div className="text-xs text-slate-400">{fmtNumber(countOf('library'))} textbook theorems checked</div>
              </div>
              <span className="font-mono text-xs text-emerald-300">Inspect →</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Stage 2 · Theory Fronts (Aiming at P ≠ NP)
          </div>
          <div className="mt-2 space-y-2">
            {(['circuit_lower_bounds', 'proof_complexity', 'gct'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectProgram(id)}
                className="w-full flex items-center justify-between rounded-lg bg-slate-950/60 border border-slate-800 px-3 py-2 text-left text-xs"
              >
                <span className="font-semibold text-slate-100">
                  {id === 'circuit_lower_bounds'
                    ? 'Circuit Lower Bounds'
                    : id === 'proof_complexity'
                    ? 'Proof Complexity'
                    : 'Geometric Complexity (GCT)'}
                </span>
                <span className="font-mono text-slate-400">{fmtNumber(countOf(id))} checked →</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectLemma('L-clb-036')}
          className="w-full rounded-xl border border-amber-400/50 bg-amber-500/10 p-4 text-left"
        >
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            STAGE 3 · THE 50-YEAR BARRIER WALL (LOCKED)
          </div>
          <p className="mt-1 text-xs text-slate-300">
            Gate L-clb-036 (SAT needs &gt; n^1.01 gates) has no known method yet, and any proof must bypass Relativization, Natural Proofs, and Algebrization before reaching P ≠ NP.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectProgram('p_eq_np_search')}
          className="w-full rounded-xl border border-teal-400/35 bg-teal-950/25 p-4 text-left"
        >
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-teal-300">
            <span className="inline-flex items-center gap-1.5">
              {stats.pEqNpChecked ? <Sparkles className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              PARALLEL BYPASS · P = NP SEARCH
            </span>
            <span>{countOf('p_eq_np_search')} survived</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            Finding one fast SAT algorithm would bypass the barrier wall completely. Currently parked ({refutedOf('p_eq_np_search')} candidates killed).
          </p>
        </button>
      </div>
    </section>
  );
};
