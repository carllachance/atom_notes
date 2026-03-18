// Synthetic demo content for Atom Notes.
// All content in this file is fictional and intended only to make the product demo intelligible.

export type DemoWorkspace = {
  id: string;
  name: string;
  color?: string;
};

export type DemoNote = {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'idea' | 'task' | 'process' | 'insight' | 'bug' | 'project' | 'code';
  workspaceId: string;
  workspaceName: string;
  tags: string[];
  state: 'captured' | 'active' | 'refined' | 'archived';
  createdAt: string;
  updatedAt: string;
  links?: Array<{ label: string; url: string }>;
  attachments?: Array<{ id: string; name: string; kind: 'pdf' | 'image' | 'doc' | 'csv' }>;
};

export type DemoRelationship = {
  id: string;
  fromId: string;
  toId: string;
  type: 'refines' | 'related_to' | 'blocks' | 'implements' | 'part_of' | 'depends_on' | 'impacts' | 'derived_from';
};

export const demoWorkspaces: DemoWorkspace[] = [
  { id: 'ws_regulatory', name: 'Regulatory', color: '#8b5cf6' },
  { id: 'ws_trading', name: 'Trading Analysis', color: '#06b6d4' },
  { id: 'ws_product', name: 'Product', color: '#f59e0b' },
  { id: 'ws_ingestion', name: 'Ingestion', color: '#10b981' },
  { id: 'ws_sideprojects', name: 'Side Projects', color: '#ef4444' },
  { id: 'ws_research', name: 'Research', color: '#6366f1' }
];

export const demoNotes: DemoNote[] = [
  {
    id: 'note_reg_001',
    title: 'Daily Fed Report Overview',
    content:
      'Outline of required fields, timing expectations, and downstream dependencies for the daily Fed report. This note exists as the anchor summary for the broader reporting cluster.',
    type: 'note',
    workspaceId: 'ws_regulatory',
    workspaceName: 'Regulatory',
    tags: ['fed', 'reporting', 'daily'],
    state: 'refined',
    createdAt: '2026-02-03T08:20:00Z',
    updatedAt: '2026-02-04T13:05:00Z',
    links: [{ label: 'Reference portal', url: 'https://example.com/fed-report' }]
  },
  {
    id: 'note_reg_002',
    title: 'Submit Fed Report',
    content:
      'Working process note: validate source trades, reconcile totals, check previous day exceptions, and submit through the reporting portal before cutoff.',
    type: 'process',
    workspaceId: 'ws_regulatory',
    workspaceName: 'Regulatory',
    tags: ['fed', 'submission', 'process'],
    state: 'active',
    createdAt: '2026-02-03T09:10:00Z',
    updatedAt: '2026-02-07T10:42:00Z'
  },
  {
    id: 'note_reg_003',
    title: 'Late Submission Risk',
    content:
      'If upstream trade validation slips, the reporting window compresses quickly. Need visible alerting at least 30 minutes before cutoff when unreconciled counts remain.',
    type: 'insight',
    workspaceId: 'ws_regulatory',
    workspaceName: 'Regulatory',
    tags: ['risk', 'alerts', 'timing'],
    state: 'active',
    createdAt: '2026-02-05T12:15:00Z',
    updatedAt: '2026-02-05T12:15:00Z'
  },
  {
    id: 'note_reg_004',
    title: 'Exception Queue Triage',
    content:
      'Triage order for reporting exceptions: missing identifiers first, timestamp anomalies second, quantity mismatches third. This keeps the highest-impact errors visible earliest.',
    type: 'task',
    workspaceId: 'ws_regulatory',
    workspaceName: 'Regulatory',
    tags: ['exceptions', 'triage', 'queue'],
    state: 'active',
    createdAt: '2026-02-06T14:00:00Z',
    updatedAt: '2026-02-08T16:21:00Z'
  },
  {
    id: 'note_reg_005',
    title: 'Desk Procedure Paragraph Atomization',
    content:
      'The reporting procedure document is highly structured. There is likely real value in splitting each subsection into independent atoms with parent-child traceability back to the original document.',
    type: 'idea',
    workspaceId: 'ws_regulatory',
    workspaceName: 'Regulatory',
    tags: ['procedures', 'atomization', 'documents'],
    state: 'captured',
    createdAt: '2026-02-09T11:32:00Z',
    updatedAt: '2026-02-09T11:32:00Z',
    attachments: [{ id: 'att_reg_proc', name: 'fed_procedure.pdf', kind: 'pdf' }]
  },
  {
    id: 'note_reg_006',
    title: 'Reg YY Cross-Reference Candidate',
    content:
      'Potential future workspace for regulations that link directly to current source material and continuously refresh against the latest published text.',
    type: 'project',
    workspaceId: 'ws_regulatory',
    workspaceName: 'Regulatory',
    tags: ['regulations', 'reg-yy', 'source-of-truth'],
    state: 'captured',
    createdAt: '2026-02-11T15:18:00Z',
    updatedAt: '2026-02-11T15:18:00Z'
  },
  {
    id: 'note_trade_001',
    title: 'FWS Trade Anomalies',
    content:
      'A small number of trades appear multiple times in the same day because earlier clearing attempts fail and later attempts succeed. For reporting, the latest timestamp is the one that matters.',
    type: 'insight',
    workspaceId: 'ws_trading',
    workspaceName: 'Trading Analysis',
    tags: ['fws', 'anomalies', 'data-quality'],
    state: 'refined',
    createdAt: '2026-02-04T10:02:00Z',
    updatedAt: '2026-02-12T09:50:00Z'
  },
  {
    id: 'note_trade_002',
    title: 'Duplicate Trade Filter Logic',
    content:
      'Candidate rule: group by business keys and keep the record with the most recent execution timestamp. Log removed rows so the desk can validate the assumption.',
    type: 'code',
    workspaceId: 'ws_trading',
    workspaceName: 'Trading Analysis',
    tags: ['duplicates', 'etl', 'filtering'],
    state: 'refined',
    createdAt: '2026-02-04T10:40:00Z',
    updatedAt: '2026-02-13T08:07:00Z'
  },
  {
    id: 'note_trade_003',
    title: 'Counterparty Signal Concentration',
    content:
      'Need a repeatable notebook to determine which counterparties contribute most to periodic behavior in the aggregate time series. This is likely useful both analytically and operationally.',
    type: 'project',
    workspaceId: 'ws_trading',
    workspaceName: 'Trading Analysis',
    tags: ['fft', 'counterparty', 'signals'],
    state: 'active',
    createdAt: '2026-02-07T08:55:00Z',
    updatedAt: '2026-02-14T17:10:00Z'
  },
  {
    id: 'note_trade_004',
    title: 'Per-Second Volume Rollup',
    content:
      'Aggregate raw events into a per-second series before spectral analysis. This reduces the visual noise while preserving enough structure to expose recurring behavior.',
    type: 'process',
    workspaceId: 'ws_trading',
    workspaceName: 'Trading Analysis',
    tags: ['timeseries', 'aggregation', 'volume'],
    state: 'active',
    createdAt: '2026-02-08T13:12:00Z',
    updatedAt: '2026-02-08T13:12:00Z'
  },
  {
    id: 'note_trade_005',
    title: 'CUSIP Enrichment Idea',
    content:
      'Join issue date, tenor, and security metadata onto transactional records to support more meaningful network and cluster analysis across instruments.',
    type: 'idea',
    workspaceId: 'ws_trading',
    workspaceName: 'Trading Analysis',
    tags: ['cusip', 'enrichment', 'market-data'],
    state: 'active',
    createdAt: '2026-02-10T16:26:00Z',
    updatedAt: '2026-02-10T16:26:00Z'
  },
  {
    id: 'note_trade_006',
    title: 'Health Metrics Dashboard',
    content:
      'High-level dashboard should separate always-watch metrics from situational metrics. Too many equal-weight charts make drift detection harder, not easier.',
    type: 'note',
    workspaceId: 'ws_trading',
    workspaceName: 'Trading Analysis',
    tags: ['dashboard', 'health-metrics', 'monitoring'],
    state: 'captured',
    createdAt: '2026-02-13T09:40:00Z',
    updatedAt: '2026-02-13T09:40:00Z'
  },
  {
    id: 'note_trade_007',
    title: 'Datashader Network Experiment',
    content:
      'Large relationship graphs become visually muddy with ordinary scatter plots. Datashader may keep the network legible at much larger scales.',
    type: 'idea',
    workspaceId: 'ws_trading',
    workspaceName: 'Trading Analysis',
    tags: ['datashader', 'network', 'scale'],
    state: 'captured',
    createdAt: '2026-02-15T11:48:00Z',
    updatedAt: '2026-02-15T11:48:00Z'
  },
  {
    id: 'note_prod_001',
    title: 'Atom Notes UI Concept',
    content:
      'Notes should feel like living objects rather than static cards. The system should surface relationships, context, and state without forcing the user into rigid folders too early.',
    type: 'idea',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['ui', 'vision', 'notes'],
    state: 'refined',
    createdAt: '2026-02-02T07:45:00Z',
    updatedAt: '2026-02-16T10:55:00Z'
  },
  {
    id: 'note_prod_002',
    title: 'Constellation View',
    content:
      'Rename Connections to Constellation. The view should feel spatial, intentional, and meaningful rather than like a utility screen full of generic links.',
    type: 'idea',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['constellation', 'naming', 'ux'],
    state: 'active',
    createdAt: '2026-02-06T09:08:00Z',
    updatedAt: '2026-02-16T09:18:00Z'
  },
  {
    id: 'note_prod_003',
    title: 'Thinking Layer Entry Point',
    content:
      'Open the Thinking Layer with a purple brain icon and readable tooltip text rather than collapsed initialism. It should invite exploration instead of requiring interpretation.',
    type: 'task',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['thinking-layer', 'sidebar', 'discoverability'],
    state: 'active',
    createdAt: '2026-02-12T12:05:00Z',
    updatedAt: '2026-02-17T08:14:00Z'
  },
  {
    id: 'note_prod_004',
    title: 'Highlight Focus Top Bar Resize Bug',
    content:
      'Top bar unexpectedly resizes when Highlight Focus is toggled. Behavior breaks trust because the chrome shifts at the exact moment the user expects visual clarity.',
    type: 'bug',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['bug', 'top-bar', 'focus-mode'],
    state: 'active',
    createdAt: '2026-02-12T12:20:00Z',
    updatedAt: '2026-02-17T08:20:00Z'
  },
  {
    id: 'note_prod_005',
    title: 'Where Was I Prompt',
    content:
      'The recovery prompt should be more assertive and useful. It should feel like the system is helping the user resume momentum, not just pointing at a history trail.',
    type: 'idea',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['resume', 'wayfinding', 'momentum'],
    state: 'captured',
    createdAt: '2026-02-14T15:04:00Z',
    updatedAt: '2026-02-14T15:04:00Z'
  },
  {
    id: 'note_prod_006',
    title: 'Workspace Label on Collapsed Notes',
    content:
      'Every collapsed note should visibly retain its workspace name. Without that label, commingled notes become visually elegant but cognitively vague.',
    type: 'task',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['workspace', 'labels', 'collapsed-note'],
    state: 'refined',
    createdAt: '2026-02-15T09:25:00Z',
    updatedAt: '2026-02-18T16:50:00Z'
  },
  {
    id: 'note_prod_007',
    title: 'Hover Relationship Glow',
    content:
      'Current hover glow is too weak to convey relational importance. Relationship emphasis should be more confident, brighter, and directional when appropriate.',
    type: 'bug',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['relationships', 'hover', 'visuals'],
    state: 'active',
    createdAt: '2026-02-16T13:41:00Z',
    updatedAt: '2026-02-18T18:11:00Z'
  },
  {
    id: 'note_prod_008',
    title: 'Word-Free Capture Button',
    content:
      'Capture may work better as an icon-first action if placement and affordance are obvious. Reducing label weight could make the top-level controls feel calmer.',
    type: 'idea',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['capture', 'controls', 'minimal-ui'],
    state: 'captured',
    createdAt: '2026-02-18T09:03:00Z',
    updatedAt: '2026-02-18T09:03:00Z'
  },
  {
    id: 'note_prod_009',
    title: 'Commingled Notes Differentiation',
    content:
      'When multiple projects share a surface, the interface needs a graceful way to show both local context and cross-project overlap. Color alone is not enough; grouping cues must reinforce meaning.',
    type: 'note',
    workspaceId: 'ws_product',
    workspaceName: 'Product',
    tags: ['workspace', 'surface', 'context'],
    state: 'active',
    createdAt: '2026-02-18T10:36:00Z',
    updatedAt: '2026-02-19T11:26:00Z'
  },
  {
    id: 'note_ingest_001',
    title: 'Procedure Ingestion Pipeline',
    content:
      'Python pipeline should ingest structured Word documents, preserve headings and subsection hierarchy, and split content into stable atoms with source traceability.',
    type: 'project',
    workspaceId: 'ws_ingestion',
    workspaceName: 'Ingestion',
    tags: ['python', 'pipeline', 'word-docs'],
    state: 'active',
    createdAt: '2026-02-05T08:33:00Z',
    updatedAt: '2026-02-19T13:17:00Z',
    attachments: [{ id: 'att_ing_001', name: 'ops_procedure.docx', kind: 'doc' }]
  },
  {
    id: 'note_ingest_002',
    title: 'python-docx Heading Extraction',
    content:
      'Use paragraph styles to recover section structure, then stitch each paragraph block back to its heading lineage. This creates a natural map for atom creation.',
    type: 'code',
    workspaceId: 'ws_ingestion',
    workspaceName: 'Ingestion',
    tags: ['python-docx', 'headings', 'structure'],
    state: 'refined',
    createdAt: '2026-02-06T10:14:00Z',
    updatedAt: '2026-02-20T09:31:00Z'
  },
  {
    id: 'note_ingest_003',
    title: 'Structured Redaction Pass',
    content:
      'Before sending policy text to an external model, replace account names, employee names, system identifiers, and internal references with stable placeholders so logic survives while sensitive details do not.',
    type: 'process',
    workspaceId: 'ws_ingestion',
    workspaceName: 'Ingestion',
    tags: ['redaction', 'privacy', 'llm'],
    state: 'refined',
    createdAt: '2026-02-09T14:55:00Z',
    updatedAt: '2026-02-20T15:03:00Z'
  },
  {
    id: 'note_ingest_004',
    title: 'Mermaid Chart per Procedure',
    content:
      'Once atoms are extracted, generate a clean Mermaid diagram for each process. This could make procedural review dramatically faster for both operators and managers.',
    type: 'idea',
    workspaceId: 'ws_ingestion',
    workspaceName: 'Ingestion',
    tags: ['mermaid', 'process-map', 'visualization'],
    state: 'active',
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-21T10:10:00Z'
  },
  {
    id: 'note_ingest_005',
    title: 'Policy Change Impact Analysis',
    content:
      'If a corporate summary email announces policy changes, the system should identify affected atoms, impacted procedures, and downstream operational notes likely to require revision.',
    type: 'insight',
    workspaceId: 'ws_ingestion',
    workspaceName: 'Ingestion',
    tags: ['impact-analysis', 'policy', 'change-detection'],
    state: 'captured',
    createdAt: '2026-02-12T16:42:00Z',
    updatedAt: '2026-02-12T16:42:00Z'
  },
  {
    id: 'note_ingest_006',
    title: 'YAML Workspace Definition Sketch',
    content:
      'Workspace config should declare source types, extraction rules, refresh cadence, redaction settings, and relationship policies so ingestion remains explainable and reproducible.',
    type: 'note',
    workspaceId: 'ws_ingestion',
    workspaceName: 'Ingestion',
    tags: ['yaml', 'config', 'workspace'],
    state: 'captured',
    createdAt: '2026-02-13T11:18:00Z',
    updatedAt: '2026-02-13T11:18:00Z'
  },
  {
    id: 'note_side_001',
    title: 'Weather + Fishing Dashboard',
    content:
      'Combine premium weather forecasts, marine conditions, and Garmin boat telemetry into a single understated screen that answers whether the conditions are promising and why.',
    type: 'project',
    workspaceId: 'ws_sideprojects',
    workspaceName: 'Side Projects',
    tags: ['weather', 'fishing', 'dashboard'],
    state: 'active',
    createdAt: '2026-02-07T07:20:00Z',
    updatedAt: '2026-02-22T08:32:00Z'
  },
  {
    id: 'note_side_002',
    title: 'Wind Arrow Visualization',
    content:
      'A fullscreen display with animated vector arrows could make forecast changes feel intuitive at a glance, especially if direction shifts become visible before they are consciously noticed.',
    type: 'idea',
    workspaceId: 'ws_sideprojects',
    workspaceName: 'Side Projects',
    tags: ['wind', 'animation', 'forecast'],
    state: 'active',
    createdAt: '2026-02-08T07:48:00Z',
    updatedAt: '2026-02-22T08:41:00Z'
  },
  {
    id: 'note_side_003',
    title: 'Garmin Data Retrieval Unknowns',
    content:
      'Boat account exists, but data access path is unclear. Need to verify available exports or API surface before designing too much around telemetry granularity.',
    type: 'task',
    workspaceId: 'ws_sideprojects',
    workspaceName: 'Side Projects',
    tags: ['garmin', 'api', 'telemetry'],
    state: 'captured',
    createdAt: '2026-02-10T12:40:00Z',
    updatedAt: '2026-02-10T12:40:00Z'
  },
  {
    id: 'note_side_004',
    title: 'Constellations Splash Screen',
    content:
      'Animated constellation motifs would fit the product theme well if motion remains elegant and slow. The key is moving from complexity toward clarity, not showing off particles for their own sake.',
    type: 'idea',
    workspaceId: 'ws_sideprojects',
    workspaceName: 'Side Projects',
    tags: ['animation', 'splash', 'constellation'],
    state: 'refined',
    createdAt: '2026-02-11T18:26:00Z',
    updatedAt: '2026-02-21T09:12:00Z'
  },
  {
    id: 'note_side_005',
    title: 'Mountain Trail Visual Concept',
    content:
      'Ski telemetry visual should show multiple trails with subtle path differentiation rather than a single dramatic line. More grounded, still beautiful.',
    type: 'note',
    workspaceId: 'ws_sideprojects',
    workspaceName: 'Side Projects',
    tags: ['ski', 'visualization', 'trails'],
    state: 'archived',
    createdAt: '2026-02-14T17:50:00Z',
    updatedAt: '2026-02-18T08:00:00Z'
  },
  {
    id: 'note_res_001',
    title: 'Query Layer Instead of Inbox',
    content:
      'Maybe the app should open to a blinking cursor and query layer rather than a traditional inbox. Asking for “Reg YY” or “daily fed report” should immediately surface the relevant universe.',
    type: 'idea',
    workspaceId: 'ws_research',
    workspaceName: 'Research',
    tags: ['query', 'entry-point', 'lens'],
    state: 'refined',
    createdAt: '2026-02-08T08:05:00Z',
    updatedAt: '2026-02-23T10:44:00Z'
  },
  {
    id: 'note_res_002',
    title: 'Atoms Belong to More Than One Molecule',
    content:
      'An individual note may participate in multiple conceptual groupings. That principle is the core reason rigid folder-first organization feels limiting for this product.',
    type: 'insight',
    workspaceId: 'ws_research',
    workspaceName: 'Research',
    tags: ['atoms', 'molecules', 'knowledge-model'],
    state: 'refined',
    createdAt: '2026-02-08T09:11:00Z',
    updatedAt: '2026-02-23T11:05:00Z'
  },
  {
    id: 'note_res_003',
    title: 'Verb Query Example: Submit',
    content:
      'The system should handle verb queries as naturally as noun queries. “Submit” should reveal procedures, timing constraints, forms, dependencies, and recent related notes.',
    type: 'note',
    workspaceId: 'ws_research',
    workspaceName: 'Research',
    tags: ['verbs', 'querying', 'discovery'],
    state: 'active',
    createdAt: '2026-02-09T08:58:00Z',
    updatedAt: '2026-02-23T11:18:00Z'
  }
];

export const demoRelationships: DemoRelationship[] = [
  { id: 'rel_reg_001', fromId: 'note_reg_002', toId: 'note_reg_001', type: 'derived_from' },
  { id: 'rel_reg_002', fromId: 'note_reg_002', toId: 'note_reg_004', type: 'depends_on' },
  { id: 'rel_reg_003', fromId: 'note_reg_003', toId: 'note_reg_002', type: 'blocks' },
  { id: 'rel_reg_004', fromId: 'note_reg_005', toId: 'note_reg_001', type: 'refines' },
  { id: 'rel_reg_005', fromId: 'note_reg_006', toId: 'note_reg_001', type: 'related_to' },
  { id: 'rel_trade_001', fromId: 'note_trade_002', toId: 'note_trade_001', type: 'derived_from' },
  { id: 'rel_trade_002', fromId: 'note_trade_003', toId: 'note_trade_004', type: 'depends_on' },
  { id: 'rel_trade_003', fromId: 'note_trade_005', toId: 'note_trade_003', type: 'impacts' },
  { id: 'rel_trade_004', fromId: 'note_trade_006', toId: 'note_trade_003', type: 'related_to' },
  { id: 'rel_trade_005', fromId: 'note_trade_007', toId: 'note_prod_002', type: 'related_to' },
  { id: 'rel_prod_001', fromId: 'note_prod_002', toId: 'note_prod_001', type: 'refines' },
  { id: 'rel_prod_002', fromId: 'note_prod_003', toId: 'note_prod_002', type: 'part_of' },
  { id: 'rel_prod_003', fromId: 'note_prod_004', toId: 'note_prod_003', type: 'blocks' },
  { id: 'rel_prod_004', fromId: 'note_prod_006', toId: 'note_prod_009', type: 'impacts' },
  { id: 'rel_prod_005', fromId: 'note_prod_007', toId: 'note_prod_002', type: 'blocks' },
  { id: 'rel_prod_006', fromId: 'note_prod_008', toId: 'note_prod_001', type: 'refines' },
  { id: 'rel_ingest_001', fromId: 'note_ingest_001', toId: 'note_reg_005', type: 'implements' },
  { id: 'rel_ingest_002', fromId: 'note_ingest_002', toId: 'note_ingest_001', type: 'part_of' },
  { id: 'rel_ingest_003', fromId: 'note_ingest_003', toId: 'note_ingest_001', type: 'depends_on' },
  { id: 'rel_ingest_004', fromId: 'note_ingest_004', toId: 'note_ingest_001', type: 'impacts' },
  { id: 'rel_ingest_005', fromId: 'note_ingest_005', toId: 'note_reg_006', type: 'related_to' },
  { id: 'rel_ingest_006', fromId: 'note_ingest_006', toId: 'note_ingest_001', type: 'related_to' },
  { id: 'rel_side_001', fromId: 'note_side_002', toId: 'note_side_001', type: 'part_of' },
  { id: 'rel_side_002', fromId: 'note_side_003', toId: 'note_side_001', type: 'blocks' },
  { id: 'rel_side_003', fromId: 'note_side_004', toId: 'note_prod_002', type: 'related_to' },
  { id: 'rel_side_004', fromId: 'note_side_005', toId: 'note_side_001', type: 'derived_from' },
  { id: 'rel_res_001', fromId: 'note_res_001', toId: 'note_prod_002', type: 'related_to' },
  { id: 'rel_res_002', fromId: 'note_res_002', toId: 'note_prod_001', type: 'related_to' },
  { id: 'rel_res_003', fromId: 'note_res_003', toId: 'note_reg_002', type: 'depends_on' },
  { id: 'rel_res_004', fromId: 'note_res_003', toId: 'note_res_001', type: 'refines' }
];
