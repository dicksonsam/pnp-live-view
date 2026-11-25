export type LemmaStatus = 'checked' | 'conjecture' | 'in_work' | 'refuted' | 'blocked' | 'retired';

export type ProgramAim = 'p_neq_np' | 'p_eq_np' | 'neutral';

export type AttackStatus = 'live' | 'support' | 'stopped' | 'dormant';

export interface HeadCounters {
  checked: number;
  checked_surplus?: number;
  refuted: number;
  blocked: number;
  in_work: number;
  agents_active: number;
  agents_working_now: number;
  agent_sessions_total: number;
  conjecture: number;
  lemmas: number;
  checked_last_hour: number;
  last_checked_at?: string;
  checker_runs_accepted_hour?: number;
  messages_today?: number;
}

export interface HeadBreakthrough {
  id: string;
  claim_plain: string;
  claim_formal?: string;
  status: 'lean_checked' | 'rechecked_independently' | 'human_reviewed' | 'published';
  result_page?: string;
  released_by: string;
  released_at: string;
}

export interface HeadData {
  layout: string;
  version: string;
  generated_at: string;
  checked_at?: string;
  started_at: string;
  counters: HeadCounters;
  status?: {
    at: string;
    seat: string;
    text: string;
  };
  feed: {
    events: number;
    page_size: number;
  };
  files: {
    map: string;
    feed: string;
    feeds?: string;
    calendar?: string;
    seats?: string;
    plan?: string;
    news?: string;
    contributors?: string;
    papers?: string;
    graveyard?: string;
    [key: string]: string | undefined;
  };
  outside?: {
    count: number;
    steps: number;
    newest?: {
      github: string;
      lemma_id: string;
      ref?: string;
      at: string;
    };
    faces?: Array<{ github: string }>;
  };
  breakthrough: HeadBreakthrough | null;
  just_in?: {
    text: string;
    at: string;
    href?: string;
  } | null;
  join_open?: boolean;
  agents_now_fleet?: number;
  agents_now_public?: number;
  agents_now_total?: number;
  agents_now_window_s?: number;
  agents_now_public_at?: string;
  sessions_total?: number;
  sessions_fleet?: number;
  sessions_public_min?: number;
}

export interface IncidentData {
  state: 'degraded' | 'outage' | 'resolved' | string;
  label?: string;
  message?: string;
  since: string;
  resolved_at?: string;
  status_url?: string;
}

export interface ProgramOverview {
  id: string;
  key: string;
  title: string;
  aims_at: ProgramAim;
  counts: {
    checked: number;
    in_work: number;
    conjecture: number;
    refuted: number;
    blocked: number;
    retired?: number;
    not_faithful?: number;
    surplus?: number;
  };
  goal: string;
  dead?: string[];
  status: string;
  across?: Record<string, number>;
  file: string;
}

export interface AttackLine {
  id: string;
  title: string;
  status: AttackStatus;
  program: string;
  why: string;
  rows: string[];
}

export interface OverviewMap {
  programs: ProgramOverview[];
  attack: AttackLine[];
  attack_source?: {
    file: string;
    commit: string;
    updated_at: string;
    read_by: string;
  };
  outside_results?: number;
}

export interface PlanChainItem {
  lemma_id?: string;
  title: string;
  status?: LemmaStatus;
}

export interface PlanProgram {
  short_name: string;
  target: {
    title: string;
    lemma_id?: string;
    plain: string;
    beyond?: string;
    goal?: string;
    held_note?: string;
    status?: LemmaStatus;
  };
  chain: PlanChainItem[];
  hard_link?: {
    lemma_id?: string;
    title: string;
    status?: LemmaStatus;
    why_hard?: string;
    plain?: string;
    attempts_in_flight?: number;
    attempts_died?: Array<{
      by: string;
      ended_at: string;
      why_died: string;
    }>;
  };
}

export interface PlanData {
  updated_at: string;
  kills?: {
    today: number;
    median_life_minutes: number;
  };
  programs: Record<string, PlanProgram>;
}

export interface LiveSeat {
  id: string;
  program: string;
  active: boolean;
  roles: string[];
  subagents_now: number;
  holds: string[];
  activity?: string;
  activity_state?: string;
  activity_started_at?: string;
  current_activity?: {
    verb: string;
    target: string | null;
    since: string | null;
  };
}

export interface LiveEdge {
  from: string;
  to: string;
  at: string[];
}

export interface CheckerRun {
  at: string;
  seat: string;
  lemma_id: string;
  kind: 'check' | 'refute' | string;
  accepted: boolean;
}

export interface LiveMessage {
  at: string;
  from: string;
  to: string;
  text: string;
}

export interface LiveData {
  at: string;
  window_minutes: number;
  text_off?: boolean;
  seats: LiveSeat[];
  edges: LiveEdge[];
  checker_runs: CheckerRun[];
  messages: LiveMessage[];
  dropped_last_hour?: number;
  not_shown_last_hour?: number;
  messages_today?: number;
}

export interface SeatSummary {
  id: string;
  program: string;
  active: boolean;
  counts: {
    checked: number;
    refuted: number;
    blocked: number;
    in_work: number;
    attempts: number;
    objections_filed: number;
  };
  file: string;
}

export interface SeatMilestone {
  id: string;
  seat: string;
  title: string;
  status: string;
  opened_at: string;
  concluded_at?: string;
  outcome?: string;
  conclusion?: string;
  lemma_ids?: string[];
}

export interface SeatDetail {
  id: string;
  program: string;
  mandate?: string;
  active: boolean;
  subagents_now?: number;
  counts: {
    checked: number;
    refuted: number;
    blocked: number;
    in_work: number;
    attempts: number;
    objections_filed: number;
  };
  milestones?: SeatMilestone[];
}

export interface NewsArticleSummary {
  id: string;
  title: string;
  dek: string;
  program: string;
  covers?: string[];
  author_seat?: string;
  editor_seat?: string;
  published_at: string;
  file: string;
}

export interface NewsIndex {
  articles: NewsArticleSummary[];
}

export interface NewsArticleDetail {
  id: string;
  title: string;
  dek: string;
  program: string;
  body: Array<{ p?: string; h?: string }>;
  author_seat?: string;
  editor_seat?: string;
  published_at: string;
  related?: {
    lemmas?: string[];
    seats?: string[];
  };
}

export interface CalendarIndex {
  months: Array<{
    month: string;
    checked: number;
    refuted: number;
    blocked: number;
    total: number;
    file: string;
  }>;
}

export interface CalendarDayData {
  checked: number;
  refuted: number;
  blocked: number;
  total: number;
  first_seq?: number;
  last_seq?: number;
  lanes: Record<string, Array<[number, number, number, number]>>;
}

export interface CalendarMonthData {
  month: string;
  days: Record<string, CalendarDayData>;
}

export interface ProgramNodesFile {
  nodes: Array<[number, string, number, string, number]>;
}

export interface LemmaDetail {
  id: string;
  title: string;
  formal_statement?: string;
  plain_statement?: string;
  stale_plain?: boolean;
  status: LemmaStatus;
  barrier?: string | null;
  depends_on?: string[];
  used_by?: string[];
  program: string;
  seat?: string;
  proposed_at?: string;
  status_at?: string;
  kind?: string;
  corrections?: Array<{ at?: string; text?: string; note?: string }>;
  attempts?: Array<{
    when: string;
    ended_at?: string;
    by: string;
    outcome: string;
    why_died?: string;
  }>;
  artifact?: {
    lean_file?: string;
    checker_version?: string;
    checker_run_id?: string;
    content_hash?: string;
    runner_url?: string;
  };
  contributor?: {
    github?: string;
    pr_url?: string;
    merged_at?: string;
  };
}

export interface AtlasSnapshot {
  head: HeadData;
  live: LiveData;
  map: OverviewMap;
  plan: PlanData | null;
  news: NewsIndex | null;
  seats: SeatSummary[];
  calendarMonth: CalendarMonthData | null;
  incident: IncidentData | null;
  fetchedAt: number;
}

export type DrawerView =
  | { kind: 'program'; programId: string }
  | { kind: 'lemma'; lemmaId: string }
  | { kind: 'seat'; seatId: string }
  | { kind: 'article'; article: NewsArticleSummary }
  | { kind: 'messages'; filterSeat?: string }
  | { kind: 'checker'; filterAccepted?: 'all' | 'accepted' | 'rejected' };
