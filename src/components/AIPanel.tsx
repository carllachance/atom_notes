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
  onPreviewAction: (action: ActionSuggestion) => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
};

function placeholderForMode(mode: AIInteractionMode, selectedNote: NoteCardModel | null) {
  if (mode === 'explore') return 'Explore relationships…';
  if (mode === 'summarize') return 'Summarize this note or cluster…';
  if (mode === 'act') return 'Propose a safe action…';
  return selectedNote ? 'Ask about this note…' : 'Ask about the current canvas…';
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
  onPreviewAction,
  onConfirmAction,
  onCancelAction
}: AIPanelProps) {
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const resolvedReferences = panel.response?.references.map((referenceId) => notesById.get(referenceId)).filter(Boolean) as NoteCardModel[] | undefined;

  return (
    <aside className="ai-panel" data-state={panel.state}>
      <header className="ai-panel-header">
        <div>
          <strong>Insights</strong>
          <small>
            {selectedNote ? `Selected: ${selectedNote.title ?? 'Untitled'}` : 'No note selected'} · {visibleNotesCount} visible · {activeProject?.key ?? 'All projects'}
          </small>
        </div>
        <div className="ai-panel-state-switch">
          <button className={panel.state === 'hidden' ? 'active' : ''} onClick={() => onStateChange('hidden')}>Hide</button>
          <button className={panel.state === 'peek' ? 'active' : ''} onClick={() => onStateChange('peek')}>Peek</button>
          <button className={panel.state === 'open' ? 'active' : ''} onClick={() => onStateChange('open')}>Open</button>
        </div>
      </header>

      <nav className="ai-mode-switch" aria-label="AI mode">
        {(['ask', 'explore', 'summarize', 'act'] as AIInteractionMode[]).map((mode) => (
          <button key={mode} className={panel.mode === mode ? 'active' : ''} onClick={() => onModeChange(mode)}>
            {mode}
          </button>
        ))}
      </nav>

      {panel.state === 'hidden' ? null : (
        <>
          <div className="ai-query-row">
            <label className="ai-query-label" htmlFor="ai-query-input">Ground the response in visible notes</label>
            <textarea
              id="ai-query-input"
              placeholder={placeholderForMode(panel.mode, selectedNote)}
              value={panel.query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
            <button onClick={onRun} disabled={!panel.query.trim() || panel.loading}>{panel.loading ? 'Thinking…' : 'Run'}</button>
          </div>

          {pendingAction ? (
            <div className="ai-action-preview">
              <strong>Confirm action</strong>
              <p>{pendingAction.label}</p>
              <div>
                <button className="ghost-button" onClick={onCancelAction}>Cancel</button>
                <button onClick={onConfirmAction}>Apply</button>
              </div>
            </div>
          ) : null}

          {panel.response ? (
            <div className="ai-response">
              <section className="ai-summary-block">
                <span className="ai-block-label">Grounded answer</span>
                <p className="ai-answer">{panel.response.answer}</p>
              </section>

              {panel.response.sections.map((section) => (
                <section key={section.id} className="ai-section">
                  <span className="ai-block-label">{section.title}</span>
                  <p>{section.body}</p>
                </section>
              ))}

              {resolvedReferences?.length ? (
                <section className="ai-grounded-references">
                  <div className="ai-section-heading">
                    <span className="ai-block-label">Grounded references</span>
                    <small>Clickable notes from the current graph</small>
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

              {panel.response.actions?.length ? (
                <div className="ai-action-chips">
                  {panel.response.actions.map((action) => (
                    <button key={action.id} className="ghost-button" onClick={() => onPreviewAction(action)}>
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="ai-empty-state">The panel stays grounded in visible notes, recent notes, and the selected note.</div>
          )}
        </>
      )}
    </aside>
  );
}
