import React from 'react';
import { statusOfLemma } from '../api/pnpClient';
import type { OverviewMap } from '../types/pnp';
import { STATUS_STYLES } from '../utils/format';

interface LinkedTextProps {
  text: string;
  map: OverviewMap | null;
  onSelectLemma: (lemmaId: string) => void;
  className?: string;
}

const BRACKET_GROUP_RE = /(\[\s*L-[a-z0-9]+-[0-9]{3,}[^\]\[]*\])/g;
const LEMMA_SPLIT_RE = /(L-[a-z0-9]+-[0-9]{3,})/g;
const LEMMA_EXACT_RE = /^L-[a-z0-9]+-[0-9]{3,}$/;

export const LinkedText: React.FC<LinkedTextProps> = ({
  text,
  map,
  onSelectLemma,
  className,
}) => {
  const renderLemmaButton = (id: string, key: string) => {
    const status = statusOfLemma(map, id);
    const dotClass = status ? STATUS_STYLES[status].dot : 'bg-stone-400';
    return (
      <button
        key={key}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectLemma(id);
        }}
        title={status ? `${id} · ${STATUS_STYLES[status].label}` : id}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 mx-0.5 font-mono text-[0.82em] font-medium bg-stone-100 hover:bg-stone-200/90 text-stone-800 border border-stone-200/90 transition-colors cursor-pointer align-baseline"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
        {id}
      </button>
    );
  };

  const parts = String(text).split(BRACKET_GROUP_RE);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        const bracketMatch = /^\[\s*(L-[a-z0-9]+-[0-9]{3,})([^\]]*)\]$/.exec(part);
        if (bracketMatch) {
          const id = bracketMatch[1];
          const rest = bracketMatch[2].replace(/^[\s,;:]+/, '').trim();
          return (
            <React.Fragment key={`b-${idx}`}>
              {renderLemmaButton(id, `bl-${idx}`)}
              {rest ? <span className="text-stone-500"> ({rest})</span> : null}
            </React.Fragment>
          );
        }

        const subparts = part.split(LEMMA_SPLIT_RE);
        return subparts.map((sub, sIdx) => {
          if (LEMMA_EXACT_RE.test(sub)) {
            return renderLemmaButton(sub, `l-${idx}-${sIdx}`);
          }
          return <React.Fragment key={`t-${idx}-${sIdx}`}>{sub}</React.Fragment>;
        });
      })}
    </span>
  );
};
