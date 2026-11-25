import type {
  AtlasSnapshot,
  CalendarIndex,
  CalendarMonthData,
  HeadData,
  IncidentData,
  LemmaDetail,
  LemmaStatus,
  LiveData,
  NewsArticleDetail,
  NewsIndex,
  OverviewMap,
  PlanData,
  ProgramNodesFile,
  SeatDetail,
  SeatSummary,
} from '../types/pnp';

export const DATA_BASE = 'https://data.pequalnp.com/';
export const SITE_BASE = 'https://pequalnp.com/';

const immutableCache = new Map<string, Promise<unknown>>();

export function dataUrl(rel: string): string {
  return new URL(rel, DATA_BASE).href;
}

export function getImmutable<T>(rel: string): Promise<T> {
  if (!immutableCache.has(rel)) {
    const req = fetch(dataUrl(rel))
      .then((res) => {
        if (!res.ok) throw new Error(`${rel}: HTTP ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        immutableCache.delete(rel);
        throw err;
      });
    immutableCache.set(rel, req);
  }
  return immutableCache.get(rel) as Promise<T>;
}

export async function fetchHead(): Promise<HeadData> {
  const res = await fetch(dataUrl('head.json'), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`head.json: HTTP ${res.status}`);
  return (await res.json()) as HeadData;
}

export async function fetchLive(): Promise<LiveData> {
  const res = await fetch(dataUrl('live.json'), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`live.json: HTTP ${res.status}`);
  return (await res.json()) as LiveData;
}

export async function fetchIncident(): Promise<IncidentData | null> {
  try {
    const res = await fetch(dataUrl('data/incident.json'), { cache: 'no-cache' });
    if (!res.ok) return null;
    const body = (await res.json()) as IncidentData;
    if (!body || !['degraded', 'outage', 'resolved'].includes(body.state)) return null;
    return body;
  } catch {
    return null;
  }
}

export async function fetchAtlasSnapshot(): Promise<AtlasSnapshot> {
  const [head, live, incident] = await Promise.all([
    fetchHead(),
    fetchLive(),
    fetchIncident(),
  ]);

  const [map, plan, news, seats, calIndex] = await Promise.all([
    getImmutable<OverviewMap>(head.files.map),
    head.files.plan ? getImmutable<PlanData>(head.files.plan).catch(() => null) : Promise.resolve(null),
    head.files.news ? getImmutable<NewsIndex>(head.files.news).catch(() => null) : Promise.resolve(null),
    head.files.seats ? getImmutable<SeatSummary[]>(head.files.seats).catch(() => []) : Promise.resolve([]),
    head.files.calendar ? getImmutable<CalendarIndex>(head.files.calendar).catch(() => null) : Promise.resolve(null),
  ]);

  let calendarMonth: CalendarMonthData | null = null;
  if (calIndex?.months?.length) {
    const latestMonth = calIndex.months[calIndex.months.length - 1];
    if (latestMonth?.file) {
      calendarMonth = await getImmutable<CalendarMonthData>(latestMonth.file).catch(() => null);
    }
  }

  return {
    head,
    live,
    map,
    plan,
    news,
    seats,
    calendarMonth,
    incident,
    fetchedAt: Date.now(),
  };
}

const LETTER_TO_STATUS: Record<string, LemmaStatus> = {
  c: 'checked',
  j: 'conjecture',
  w: 'in_work',
  r: 'refuted',
  b: 'blocked',
  x: 'retired',
};

export const LEMMA_ID_RE = /^L-([a-z0-9]+)-([0-9]{3,})$/;

export function parseLemmaId(id: string): { key: string; n: number } | null {
  const m = LEMMA_ID_RE.exec(id.trim());
  return m ? { key: m[1], n: Number(m[2]) } : null;
}

export function statusOfLemma(map: OverviewMap | null | undefined, id: string): LemmaStatus | null {
  if (!map) return null;
  const parsed = parseLemmaId(id);
  if (!parsed) return null;
  const prog = map.programs.find((p) => p.key === parsed.key);
  if (!prog || !prog.status) return null;
  const letter = prog.status[parsed.n - 1];
  return letter ? LETTER_TO_STATUS[letter] ?? null : null;
}

const STALE_LABEL_RE =
  /^\s*(?:(?:(?:OPEN|HARD|NEXT)\s+)?(?:TARGET|LINK|GAP)(?:\s*\([^)]*\))?|NEW STEP[^:]*|OPEN)\s*:\s*/;
const STALE_BRACKET_RE = /\s*\((?:open|hard|target)\b[^)]*\)/gi;

export function cleanCheckedTitle(title: string, status?: LemmaStatus): string {
  if (status !== 'checked') return title;
  const cleaned = title.replace(STALE_LABEL_RE, '').replace(STALE_BRACKET_RE, '').trim();
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : title;
}

export async function fetchLemmaDetail(map: OverviewMap, id: string): Promise<LemmaDetail | null> {
  const parsed = parseLemmaId(id);
  if (!parsed) return null;
  const prog = map.programs.find((p) => p.key === parsed.key);
  if (!prog?.file) return null;
  const progNodes = await getImmutable<ProgramNodesFile>(prog.file);
  const node = progNodes.nodes.find((x) => x[0] === parsed.n);
  if (!node) return null;
  const raw = await getImmutable<LemmaDetail>(`data/lemma/${id}.${node[3]}.json`);
  if (raw.status === 'checked') {
    const plain = raw.plain_statement ?? '';
    const stale =
      /^\s*(?:OPEN|CONJECTURE)\b/.test(plain) ||
      /\bnot (?:yet )?checked\b/i.test(plain) ||
      /(?:^|[.;]\s+)Conjecture\.(?:\s|$)/.test(plain) ||
      /\bConjecture until checked\b/i.test(plain);
    const corrected = Array.isArray(raw.corrections) && raw.corrections.length > 0;
    return {
      ...raw,
      title: cleanCheckedTitle(raw.title, 'checked'),
      plain_statement: stale && !corrected ? 'Checked in Lean. See formal statement below.' : raw.plain_statement,
      stale_plain: stale && corrected,
    };
  }
  return raw;
}

export async function fetchArticleDetail(file: string): Promise<NewsArticleDetail> {
  return getImmutable<NewsArticleDetail>(file);
}

export async function fetchSeatDetail(seats: SeatSummary[], seatId: string): Promise<SeatDetail | null> {
  const entry = seats.find((s) => s.id === seatId);
  if (!entry?.file) return null;
  return getImmutable<SeatDetail>(entry.file);
}
