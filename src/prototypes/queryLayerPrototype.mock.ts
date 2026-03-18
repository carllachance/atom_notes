export type QueryPrototypeAction = {
  id: string;
  label: string;
  hint: string;
};

export type QueryPrototypeItem = {
  id: string;
  title: string;
  excerpt: string;
  summary: string;
  noteType: 'task' | 'reference' | 'concept' | 'history';
  project: string;
  focus: string;
  isFocus: boolean;
  recencyLabel: string;
  recencyHours: number;
  score: number;
  tags: string[];
  actions: QueryPrototypeAction[];
  relationships: Array<{
    id: string;
    label: string;
    kind: 'task' | 'source' | 'related' | 'history' | 'conflict';
    noteTitle: string;
    explanation: string;
    strength: 'strong' | 'supporting' | 'historical';
  }>;
};

export const queryPrototypePrompts = [
  'What is blocking the launch review?',
  'Show notes related to the onboarding graph demo.',
  'Find sources that support the focus migration plan.',
  'Trace the latest decisions behind the query-first flow.'
] as const;

export const queryPrototypeItems: QueryPrototypeItem[] = [
  {
    id: 'launch-review-blockers',
    title: 'Launch review blockers',
    excerpt: 'Three open blockers remain before the demo can move into review: stale source traceability, missing focus handoff, and a conflicting onboarding note.',
    summary: 'Operational snapshot linking active blockers to the source notes and conflict trail.',
    noteType: 'task',
    project: 'Launch cockpit',
    focus: 'Demo readiness',
    isFocus: true,
    recencyLabel: 'Touched 18m ago',
    recencyHours: 0.3,
    score: 0.96,
    tags: ['launch', 'review', 'blockers', 'demo'],
    actions: [
      { id: 'open-blocker-chain', label: 'Open blocker chain', hint: 'Mock: centers the active task path.' },
      { id: 'show-source-proof', label: 'Show source proof', hint: 'Mock: reveals the supporting evidence notes.' }
    ],
    relationships: [
      {
        id: 'launch-source',
        label: 'Source',
        kind: 'source',
        noteTitle: 'Review checklist provenance',
        explanation: 'Explicit reference to the checklist that defines launch-ready evidence.',
        strength: 'strong'
      },
      {
        id: 'launch-task',
        label: 'Task dependency',
        kind: 'task',
        noteTitle: 'Focus handoff sequence',
        explanation: 'This dependency stays active until the ownership handoff is completed.',
        strength: 'strong'
      },
      {
        id: 'launch-conflict',
        label: 'Conflict',
        kind: 'conflict',
        noteTitle: 'Onboarding timing assumption',
        explanation: 'Conflicting timing assumptions surfaced in the latest demo prep notes.',
        strength: 'supporting'
      }
    ]
  },
  {
    id: 'query-first-walkthrough',
    title: 'Query-first walkthrough notes',
    excerpt: 'A calmer entry point for demos: open with intent, reveal ranked notes, then let the graph fade in as context rather than noise.',
    summary: 'Experience framing for a query-first prototype layer that does not replace the main canvas.',
    noteType: 'concept',
    project: 'Query layer',
    focus: 'Demo flow',
    isFocus: false,
    recencyLabel: 'Touched 2h ago',
    recencyHours: 2,
    score: 0.92,
    tags: ['query', 'demo', 'prototype', 'navigation'],
    actions: [
      { id: 'inspect-ranking', label: 'Inspect ranking', hint: 'Mock: opens the current scoring rationale.' },
      { id: 'peek-history', label: 'Peek history', hint: 'Mock: fades in the earlier modal-first prototype.' }
    ],
    relationships: [
      {
        id: 'query-related',
        label: 'Related',
        kind: 'related',
        noteTitle: 'Intent-aware surfacing',
        explanation: 'Shared language around ranking by likely next need in the current session.',
        strength: 'strong'
      },
      {
        id: 'query-history',
        label: 'History',
        kind: 'history',
        noteTitle: 'Modal graph reveal v1',
        explanation: 'Historical note from the earlier modal-first exploration.',
        strength: 'historical'
      },
      {
        id: 'query-source',
        label: 'Source',
        kind: 'source',
        noteTitle: 'Prototype script for investor demo',
        explanation: 'The walkthrough references the exact demo beats captured in the script.',
        strength: 'supporting'
      }
    ]
  },
  {
    id: 'focus-migration-plan',
    title: 'Focus migration plan',
    excerpt: 'Keep the note universe intact while adding a lighter query front door. Focus metadata should remain visible without forcing the graph on first contact.',
    summary: 'Implementation note on how to preserve current note flows while adding a prototype launch surface.',
    noteType: 'history',
    project: 'Query layer',
    focus: 'Migration',
    isFocus: true,
    recencyLabel: 'Touched yesterday',
    recencyHours: 26,
    score: 0.87,
    tags: ['focus', 'migration', 'prototype', 'notes'],
    actions: [
      { id: 'mark-focus-behavior', label: 'Mark focus behavior', hint: 'Mock: records the current Focus filter decision.' },
      { id: 'compare-before-after', label: 'Compare before / after', hint: 'Mock: opens the prior interaction notes beside this plan.' }
    ],
    relationships: [
      {
        id: 'focus-history',
        label: 'History',
        kind: 'history',
        noteTitle: 'Focus only interaction notes',
        explanation: 'Captures earlier decisions about keeping Focus explicit and reversible.',
        strength: 'strong'
      },
      {
        id: 'focus-task',
        label: 'Task dependency',
        kind: 'task',
        noteTitle: 'Dev launcher affordance',
        explanation: 'The demo launcher depends on preserving existing navigation by default.',
        strength: 'supporting'
      },
      {
        id: 'focus-source',
        label: 'Source',
        kind: 'source',
        noteTitle: 'Store integration checklist',
        explanation: 'Lists the real store connection points that still need implementation.',
        strength: 'historical'
      }
    ]
  },
  {
    id: 'evidence-thread',
    title: 'Evidence thread for graph demo',
    excerpt: 'Source notes, open tasks, and rehearsal prompts should sit one query away so the presenter can pull evidence without switching mental modes.',
    summary: 'Reference-heavy note that ties sources and tasks together for live demos.',
    noteType: 'reference',
    project: 'Launch cockpit',
    focus: 'Evidence',
    isFocus: false,
    recencyLabel: 'Touched 4h ago',
    recencyHours: 4,
    score: 0.84,
    tags: ['evidence', 'sources', 'graph', 'demo'],
    actions: [
      { id: 'open-reference-set', label: 'Open references', hint: 'Mock: stages the supporting note set.' },
      { id: 'trace-dependency', label: 'Trace dependency', hint: 'Mock: follows the task chain back to evidence.' }
    ],
    relationships: [
      {
        id: 'evidence-source',
        label: 'Source',
        kind: 'source',
        noteTitle: 'Customer interview digest',
        explanation: 'Explicitly cited as the basis for the demo narrative.',
        strength: 'strong'
      },
      {
        id: 'evidence-related',
        label: 'Related',
        kind: 'related',
        noteTitle: 'Presenter cue cards',
        explanation: 'Often opened next in the same demo workflow.',
        strength: 'supporting'
      },
      {
        id: 'evidence-task',
        label: 'Task dependency',
        kind: 'task',
        noteTitle: 'Refresh source links',
        explanation: 'Still open; the evidence thread should not be considered complete yet.',
        strength: 'strong'
      }
    ]
  }
];
