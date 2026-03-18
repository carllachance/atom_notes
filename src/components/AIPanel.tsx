import { FormEvent, useEffect, useMemo, useState } from 'react';
import { INSIGHTS_RAIL_MODES, getNextInsightsRailState } from '../detailSurface/detailSurfaceModel';
import { getInsightTimelineForNote } from '../insights/insightTimeline';
import { ActionSuggestion, AIInteractionMode, AIPanelViewState, InsightTimelineEntry, InsightsResponse, NoteCardModel, Project, Workspace } from '../types';

type AIPanelProps = {
  panel: AIPanelViewState;
  selectedNote: NoteCardModel | null;
  visibleNotesCount: number;
  activeProject: Project | null;
  activeWorkspace: Workspace | null;
  scopeLabel: string;
  notes: NoteCardModel[];
  streamedResponse: InsightsResponse | null;
  timelineEntries: InsightTimelineEntry[];
  streaming: boolean;
  onStateChange: (state: AIPanelViewState['state']) => void;
  onModeChange: (mode: AIInteractionMode) => void;
  onQueryChange: (query: string) => void;
  onRun: () => void;
  onOpenReference: (noteId: string) => void;
  pendingAction: ActionSuggestion | null;
  noteIsOpen: boolean;
  onPreviewAction: (action: ActionSuggestion) => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
};

function composerLabel(mode: AIInteractionMode) {
  if (mode === 'explore') return 'Trace';
  if (mode === 'summarize') return 'Synthesize';
  if (mode === 'act') return 'Commit';
  return 'Ask';
}

function placeholderForMode(mode: AIInteractionMode, selectedNote: NoteCardModel | null) {
  if (mode === 'explore') return selectedNote ? 'Trace nearby blockers, references, or next moves' : 'Trace a pattern across the visible graph';
  if (mode === 'summarize') return selectedNote ? 'Condense this note and its strongest neighbors' : 'Condense the current scope';
  if (mode === 'act') return selectedNote ? 'Recommend the safest next action for this note' : 'Recommend the next action for this workspace';
  return selectedNote ? 'Ask from the perspective of the current note' : 'Ask about the current scope';
}

function formatTimelineTimestamp(timestamp: number) {
  const deltaMs = Date.now() - timestamp;
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));
  if (deltaMinutes < 60) return `${deltaMinutes}m`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h`;
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d`;
}

function getIntentPrompts(mode: AIInteractionMode, selectedNote: NoteCardModel | null, scopeLabel: string): string[] {
  const noteLabel = selectedNote?.title ?? 'this note';
  if (mode === 'explore') {
    return [
      `Trace what branches away from ${noteLabel}`,
      `Show the strongest neighbors in ${scopeLabel}`,
      `What conflicts or blockers are nearby?`
    ];
  }
  if (mode === 'summarize') {
    return [
      `Summarize ${noteLabel} with its local graph`,
      `Turn the visible scope into a concise brief`,
      `What matters most right now?`
    ];
  }
  if (mode === 'act') {
    return [
      `What should happen next from ${noteLabel}?`,
      'Draft the safest next step',
      'What can I commit or link right now?'
    ];
  }
  return [
    `What does ${noteLabel} connect to?`,
    `What should I inspect inside ${scopeLabel}?`,
    'What am I missing from the local graph?'
  ];
}

export function AIPanel({
  panel,
  selectedNote,
  visibleNotesCount,
  activeProject,
  activeWorkspace,
  scopeLabel,
  notes,
  streamedResponse,
  timelineEntries,
  streaming,
  onStateChange,
  onModeChange,
  onQueryChange,
  onRun,
  onOpenReference,
  pendingAction,
  noteIsOpen,
  onPreviewAction,
  onConfirmAction,
  onCancelAction
}: AIPanelProps) {
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const activeResponse = streamedResponse ?? panel.response;
  const resolvedReferences = activeResponse?.references.map((referenceId) => notesById.get(referenceId)).filter(Boolean) as NoteCardModel[] | undefined;
  const isExpanded = panel.state !== 'hidden';
  const promptSuggestions = getIntentPrompts(panel.mode, selectedNote, scopeLabel);
  const [showOlderTimeline, setShowOlderTimeline] = useState(false);
  const timeline = useMemo(() => (selectedNote ? getInsightTimelineForNote(timelineEntries, selectedNote.id) : { nowEntries: [], visibleEarlierEntries: [], hiddenEarlierEntries: [] }), [selectedNote, timelineEntries]);

  useEffect(() => {
    setShowOlderTimeline(false);
  }, [selectedNote?.id, timelineEntries.length]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRun();
  };

  const handleTimelineAction = (action: InsightTimelineEntry['actions'][number]) => {
    if (action.kind === 'open') {
      onOpenReference(action.noteId);
      return;
    }
    onPreviewAction(action.suggestion);
  };

  const visibleEarlierEntries = showOlderTimeline ? [...timeline.visibleEarlierEntries, ...timeline.hiddenEarlierEntries] : timeline.visibleEarlierEntries;

  return (
    <aside className="ai-panel" data-state={panel.state} data-note-active={noteIsOpen ? 'true' : 'false'}>
      <div className="ai-rail">
        <button
          className="ai-panel-toggle"
          onClick={() => onStateChange(getNextInsightsRailState(panel.state))}
          aria-label={panel.state === 'hidden' ? 'Expand thinking layer' : 'Collapse thinking layer'}
          title={panel.state === 'hidden' ? 'Expand thinking layer' : 'Collapse thinking layer'}
        >
          <span aria-hidden="true">{panel.state === 'hidden' ? '←' : '→'}</span>
          <span className="ai-panel-toggle-label">Thinking layer</span>
        </button>

        <nav className="ai-mode-switch" aria-label="AI mode">
          {INSIGHTS_RAIL_MODES.map(({ mode, label, shortLabel }) => (
            <button
              key={mode}
              className={panel.mode === mode ? 'active' : ''}
              onClick={() => onModeChange(mode)}
              aria-label={label}
              title={label}
            >
              <span className="ai-mode-short" aria-hidden="true">{shortLabel}</span>
              <span className="ai-mode-label">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {isExpanded ? (
        <div className="ai-panel-body">
          <header className="ai-panel-header ai-panel-header--context">
            <div className="ai-context-headline">
              <strong>Thinking layer</strong>
              <small>{streaming ? 'Streaming grounded response…' : 'Graph-aware, note-aware, and action-oriented.'}</small>
            </div>
            <div className="ai-context-pills">
              <span className="ai-context-pill"><strong>Note</strong>{selectedNote?.title ?? 'Canvas-wide'}</span>
              <span className="ai-context-pill"><strong>Scope</strong>{scopeLabel}</span>
              <span className="ai-context-pill"><strong>Workspace</strong>{activeWorkspace?.key ?? activeProject?.key ?? `${visibleNotesCount} visible`}</span>
            </div>
          </header>

          {!panel.transcript.length && !panel.query.trim() ? (
            <section className="ai-idle-prompts" aria-label="Suggested prompts">
              <div className="ai-section-heading">
                <span className="ai-block-label">Start from intent</span>
                <small>Quiet prompts grounded in the current note and scope</small>
              </div>
              <div className="ai-prompt-grid">
                {promptSuggestions.map((prompt) => (
                  <button key={prompt} className="ai-prompt-card" onClick={() => onQueryChange(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {pendingAction ? (
            <div className="ai-action-preview">
              <strong>Ready to apply</strong>
              <p>{pendingAction.label}</p>
              <div>
                <button className="ghost-button" onClick={onCancelAction} type="button">Keep as suggestion</button>
                <button onClick={onConfirmAction} type="button">Apply now</button>
              </div>
            </div>
          ) : null}

          <section className="ai-timeline" aria-label="Insight timeline">
            <div className="ai-section-heading">
              <span className="ai-block-label">Insight timeline</span>
              <small>{selectedNote ? 'Meaningful shifts only' : 'Open a note to track how understanding evolves'}</small>
            </div>

            {selectedNote ? (
              <div className="ai-timeline-groups">
                <div className="ai-timeline-group">
                  <span className="ai-timeline-label">Now</span>
                  {timeline.nowEntries.length ? (
                    <ul className="ai-timeline-list">
                      {timeline.nowEntries.map((entry) => (
                        <li key={entry.id} className={`ai-timeline-item ai-timeline-item--${entry.kind}`}>
                          <div className="ai-timeline-copy">
                            <div className="ai-timeline-row">
                              <strong>{entry.title}</strong>
                              <time dateTime={new Date(entry.createdAt).toISOString()} title={new Date(entry.createdAt).toLocaleString()}>{formatTimelineTimestamp(entry.createdAt)}</time>
                            </div>
                            <p>{entry.detail}</p>
                          </div>
                          {entry.actions.length ? (
                            <div className="ai-inline-actions ai-inline-actions--timeline">
                              {entry.actions.map((action) => (
                                <button key={action.id} className="ghost-button" onClick={() => handleTimelineAction(action)} type="button">
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="ai-empty-state ai-empty-state--timeline">High-value insight changes will gather here as links, projects, and grounded outputs accumulate.</div>
                  )}
                </div>

                {(visibleEarlierEntries.length || timeline.hiddenEarlierEntries.length) ? (
                  <div className="ai-timeline-group">
                    <div className="ai-timeline-heading-row">
                      <span className="ai-timeline-label">Earlier</span>
                      {timeline.hiddenEarlierEntries.length ? (
                        <button className="ghost-button ai-timeline-toggle" onClick={() => setShowOlderTimeline((value) => !value)} type="button">
                          {showOlderTimeline ? 'Show less' : `Show ${timeline.hiddenEarlierEntries.length} older`}
                        </button>
                      ) : null}
                    </div>
                    <ul className="ai-timeline-list">
                      {visibleEarlierEntries.map((entry) => (
                        <li key={entry.id} className={`ai-timeline-item ai-timeline-item--${entry.kind}`}>
                          <div className="ai-timeline-copy">
                            <div className="ai-timeline-row">
                              <strong>{entry.title}</strong>
                              <time dateTime={new Date(entry.createdAt).toISOString()} title={new Date(entry.createdAt).toLocaleString()}>{formatTimelineTimestamp(entry.createdAt)}</time>
                            </div>
                            <p>{entry.detail}</p>
                          </div>
                          {entry.actions.length ? (
                            <div className="ai-inline-actions ai-inline-actions--timeline">
                              {entry.actions.map((action) => (
                                <button key={action.id} className="ghost-button" onClick={() => handleTimelineAction(action)} type="button">
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="ai-empty-state ai-empty-state--timeline">Select a note to see its evolving timeline of structural changes, project moves, and grounded AI outputs.</div>
            )}
          </section>

          <div className="ai-transcript" aria-live="polite">
            {panel.transcript.length ? panel.transcript.map((entry) => (
              <section key={entry.id} className={`ai-message ai-message--${entry.role}`}>
                <div className="ai-message-meta">
                  <span>{entry.role === 'user' ? 'You' : `Thinking layer · ${composerLabel(entry.mode)}`}</span>
                </div>
                <p>{entry.content}</p>
              </section>
            )) : (
              <div className="ai-empty-state">The panel stays visible as a native thinking surface. Pick a prompt or ask directly to work from the current note and scope.</div>
            )}
          </div>

          {activeResponse ? (
            <div className="ai-response">
              <section className="ai-summary-block">
                <div className="ai-section-heading">
                  <span className="ai-block-label">Grounded answer</span>
                  <small>{streaming ? 'Updating live from the graph' : 'Ready for actions, linking, or pinning'}</small>
                </div>
                <p className="ai-answer">{activeResponse.answer || 'Thinking through the local graph…'}</p>
              </section>

              {activeResponse.results.length ? (
                <section className="ai-section">
                  <div className="ai-section-heading">
                    <span className="ai-block-label">Graph-aware results</span>
                    <small>Top notes are already highlighted on the canvas</small>
                  </div>
                  <div className="ai-reference-grid">
                    {activeResponse.results.slice(0, 3).map((result) => {
                      const note = notesById.get(result.noteId);
                      if (!note) return null;
                      return (
                        <article key={result.noteId} className="ai-reference-card ai-reference-card--result">
                          <strong>{note.title ?? 'Untitled note'}</strong>
                          <span>{result.reasons.join(' · ')}</span>
                          <div className="ai-inline-actions">
                            <button className="ghost-button" onClick={() => onOpenReference(note.id)}>Open</button>
                            {selectedNote ? (
                              <button
                                className="ghost-button"
                                onClick={() =>
                                  onPreviewAction({
                                    id: `ai-link-${selectedNote.id}-${note.id}`,
                                    label: `Link ${selectedNote.title ?? 'current note'} to ${note.title ?? 'this note'}`,
                                    kind: 'create_link',
                                    relationships: [{ fromId: selectedNote.id, toId: note.id, type: 'related' }],
                                    requiresConfirmation: true
                                  })
                                }
                              >
                                Create link
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {activeResponse.sections.map((section) => (
                <section key={section.id} className="ai-section">
                  <span className="ai-block-label">{section.title}</span>
                  <p>{section.body || '…'}</p>
                </section>
              ))}

              {resolvedReferences?.length ? (
                <section className="ai-grounded-references">
                  <div className="ai-section-heading">
                    <span className="ai-block-label">Grounded references</span>
                    <small>Open notes from the current graph context</small>
                  </div>
                  <div className="ai-reference-grid">
                    {resolvedReferences.map((reference) => (
                      <button key={reference.id} className="ai-reference-card" onClick={() => onOpenReference(reference.id)}>
                        <strong>{reference.title ?? 'Untitled note'}</strong>
                        <span>{reference.projectIds.length ? `${reference.projectIds.length} project link${reference.projectIds.length === 1 ? '' : 's'}` : 'No project links'}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {activeResponse.actions?.length ? (
                <div className="ai-action-chips">
                  {activeResponse.actions.map((action) => (
                    <button key={action.id} className="ghost-button" onClick={() => onPreviewAction(action)}>
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <form className="ai-chat-shell ai-chat-shell--sticky" onSubmit={handleSubmit}>
            <label className="ai-query-label" htmlFor="ai-query-input">What do you need from the current graph?</label>
            <div className="ai-query-row">
              <input
                id="ai-query-input"
                className="ai-query-input"
                placeholder={placeholderForMode(panel.mode, selectedNote)}
                value={panel.query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
              <button type="submit" disabled={!panel.query.trim() || panel.loading || streaming}>
                {panel.loading || streaming ? 'Thinking…' : composerLabel(panel.mode)}
              </button>
            </div>
            <p className="ai-query-hint">Intent-based prompts stay grounded in the selected note, current scope, and visible graph.</p>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
