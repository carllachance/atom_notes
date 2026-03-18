import { FormEvent } from 'react';
import { getNextInsightsRailState, INSIGHTS_RAIL_MODES } from '../detailSurface/detailSurfaceModel';
import { ActionSuggestion, AIInteractionMode, AIPanelViewState, NoteCardModel, Project } from '../types';

type AIPanelProps = {
  panel: AIPanelViewState;
  selectedNote: NoteCardModel | null;
  visibleNotesCount: number;
  activeProject: Project | null;
  notes: NoteCardModel[];
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

function placeholderForMode(mode: AIInteractionMode, selectedNote: NoteCardModel | null) {
  if (mode === 'explore') return selectedNote ? `Explore what branches away from “${selectedNote.title ?? 'this note'}”` : 'Explore nearby relationships and patterns';
  if (mode === 'summarize') return selectedNote ? 'Summarize the selected note and its nearby context' : 'Summarize the visible notes';
  if (mode === 'act') return selectedNote ? 'Suggest a safe next action for this note' : 'Suggest a safe next action for this canvas';
  return selectedNote ? `Ask about “${selectedNote.title ?? 'this note'}”` : 'Ask about the current canvas';
}

function transcriptLabel(mode: AIInteractionMode) {
  switch (mode) {
    case 'explore':
      return 'Explore';
    case 'summarize':
      return 'Summarize';
    case 'act':
      return 'Act';
    default:
      return 'Ask';
  }
}

export function AIPanel({
  panel,
  selectedNote,
  visibleNotesCount,
  activeProject,
  notes,
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
  const latestResponse = panel.response;
  const resolvedReferences = latestResponse?.references.map((referenceId) => notesById.get(referenceId)).filter(Boolean) as NoteCardModel[] | undefined;
  const isExpanded = panel.state !== 'hidden';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRun();
  };

  return (
    <aside className="ai-panel" data-state={panel.state} data-note-active={noteIsOpen ? 'true' : 'false'}>
      <div className="ai-rail">
        <button
          className="ai-panel-toggle"
          onClick={() => onStateChange(getNextInsightsRailState(panel.state))}
          aria-label={panel.state === 'hidden' ? 'Expand Insights rail' : 'Collapse Insights rail'}
          title={panel.state === 'hidden' ? 'Expand Insights rail' : 'Collapse Insights rail'}
        >
          <span aria-hidden="true">{panel.state === 'hidden' ? '←' : '→'}</span>
          <span className="ai-panel-toggle-label">Insights</span>
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
          <header className="ai-panel-header">
            <div>
              <strong>Insights</strong>
              <small>
                {selectedNote ? `Current note: ${selectedNote.title ?? 'Untitled'}` : 'No note selected'} · {visibleNotesCount} visible · {activeProject?.key ?? 'All projects'}
              </small>
            </div>
          </header>

          <form className="ai-chat-shell" onSubmit={handleSubmit}>
            <label className="ai-query-label" htmlFor="ai-query-input">{selectedNote ? 'Chat with the current note' : 'Chat with the current canvas context'}</label>
            <div className="ai-query-row">
              <input
                id="ai-query-input"
                className="ai-query-input"
                placeholder={placeholderForMode(panel.mode, selectedNote)}
                value={panel.query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
              <button type="submit" disabled={!panel.query.trim() || panel.loading}>{panel.loading ? 'Thinking…' : 'Send'}</button>
            </div>
            <p className="ai-query-hint">{transcriptLabel(panel.mode)} mode stays grounded in visible notes and the selected note’s local graph.</p>
          </form>

          {pendingAction ? (
            <div className="ai-action-preview">
              <strong>Confirm action</strong>
              <p>{pendingAction.label}</p>
              <div>
                <button className="ghost-button" onClick={onCancelAction} type="button">Cancel</button>
                <button onClick={onConfirmAction} type="button">Apply</button>
              </div>
            </div>
          ) : null}

          <div className="ai-transcript" aria-live="polite">
            {panel.transcript.length ? panel.transcript.map((entry) => (
              <section key={entry.id} className={`ai-message ai-message--${entry.role}`}>
                <div className="ai-message-meta">
                  <span>{entry.role === 'user' ? 'You' : `Insights · ${transcriptLabel(entry.mode)}`}</span>
                </div>
                <p>{entry.content}</p>
              </section>
            )) : (
              <div className="ai-empty-state">Start with a question, an exploration prompt, a summary request, or an action request. The transcript stays visible here so the exchange feels explicit instead of hidden behind mode buttons.</div>
            )}
          </div>

          {latestResponse ? (
            <div className="ai-response">
              <section className="ai-summary-block">
                <div className="ai-section-heading">
                  <span className="ai-block-label">Latest grounded answer</span>
                  <small>Directly tied to notes in the current canvas</small>
                </div>
                <p className="ai-answer">{latestResponse.answer}</p>
              </section>

              {latestResponse.sections.map((section) => (
                <section key={section.id} className="ai-section">
                  <span className="ai-block-label">{section.title}</span>
                  <p>{section.body}</p>
                </section>
              ))}

              {resolvedReferences?.length ? (
                <section className="ai-grounded-references">
                  <div className="ai-section-heading">
                    <span className="ai-block-label">Grounded references</span>
                    <small>Open related notes from the current graph</small>
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

              {latestResponse.actions?.length ? (
                <div className="ai-action-chips">
                  {latestResponse.actions.map((action) => (
                    <button key={action.id} className="ghost-button" onClick={() => onPreviewAction(action)}>
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
