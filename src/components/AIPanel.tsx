import { FormEvent, PointerEvent, useEffect, useMemo, useState } from 'react';
import { ThinkingGlyph } from './ThinkingGlyph';
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
  width: number;
  onWidthChange: (width: number) => void;
};

const RAIL_MIN_WIDTH = 320;
const RAIL_MAX_WIDTH = 520;
const ACTION_LABELS: Record<AIInteractionMode, string> = {
  ask: 'Ask',
  explore: 'Trace',
  summarize: 'Summary',
  act: 'Next'
};

function placeholderForMode(mode: AIInteractionMode, selectedNote: NoteCardModel | null) {
  if (mode === 'explore') return selectedNote ? 'Trace blockers or next moves' : 'Trace the strongest pattern here';
  if (mode === 'summarize') return selectedNote ? 'Summarize this note and nearby context' : 'Summarize the visible scope';
  if (mode === 'act') return selectedNote ? 'Recommend the safest next step' : 'Recommend the next workspace move';
  return selectedNote ? 'Ask about this note' : 'Ask about the current scope';
}

function getIntentPrompts(mode: AIInteractionMode, selectedNote: NoteCardModel | null, scopeLabel: string): string[] {
  const noteLabel = selectedNote?.title ?? 'this note';
  if (mode === 'explore') return [`Trace from ${noteLabel}`, `Show nearby blockers`, `What branches matter in ${scopeLabel}?`];
  if (mode === 'summarize') return [`Summarize ${noteLabel}`, 'What matters now?', 'Turn this scope into a brief'];
  if (mode === 'act') return [`What should happen next?`, `Give ${noteLabel} a next step`, 'What can I commit now?'];
  return [`What connects to ${noteLabel}?`, 'What am I missing?', `What should I inspect in ${scopeLabel}?`];
}

function getModeIcon(mode: AIInteractionMode) {
  if (mode === 'explore') return '◎';
  if (mode === 'summarize') return '≡';
  if (mode === 'act') return '↗';
  return '?';
}

function latestAssistantMessage(panel: AIPanelViewState) {
  return [...panel.transcript].reverse().find((entry) => entry.role === 'assistant') ?? null;
}

function summarizeTimeline(entries: InsightTimelineEntry[]) {
  if (!entries.length) return '';
  const latest = [...entries].sort((a, b) => b.createdAt - a.createdAt)[0];
  return latest ? `${latest.title}: ${latest.detail}` : '';
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
  onCancelAction,
  width,
  onWidthChange
}: AIPanelProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const activeResponse = streamedResponse ?? panel.response;
  const isExpanded = panel.state === 'open';
  const promptSuggestions = getIntentPrompts(panel.mode, selectedNote, scopeLabel);
  const timeline = useMemo(
    () => (selectedNote ? getInsightTimelineForNote(timelineEntries, selectedNote.id) : { nowEntries: [], visibleEarlierEntries: [], hiddenEarlierEntries: [] }),
    [selectedNote, timelineEntries]
  );
  const responseNotes = useMemo(
    () => activeResponse?.results.map((result) => ({ result, note: notesById.get(result.noteId) ?? null })).filter((entry) => entry.note).slice(0, 5) ?? [],
    [activeResponse, notesById]
  );
  const [showWhy, setShowWhy] = useState(false);
  const lastAssistant = latestAssistantMessage(panel);
  const timelineSummary = summarizeTimeline([...timeline.nowEntries, ...timeline.visibleEarlierEntries]);
  const primaryMessage = activeResponse?.answer || (streaming ? 'Thinking through the local graph…' : lastAssistant?.content) || '';

  useEffect(() => {
    setShowWhy(false);
  }, [selectedNote?.id, activeResponse?.answer, panel.state]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRun();
  };

  const beginResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = Math.max(RAIL_MIN_WIDTH, Math.min(RAIL_MAX_WIDTH, startWidth - (moveEvent.clientX - startX)));
      onWidthChange(nextWidth);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <aside
      className="ai-panel"
      data-state={panel.state}
      data-note-active={noteIsOpen ? 'true' : 'false'}
      style={{ ['--thinking-rail-width' as string]: `${width}px` }}
    >
      <div className="ai-rail">
        <button
          className={`ai-panel-toggle ai-panel-toggle--thinking ${panel.state === 'hidden' ? '' : 'active'}`.trim()}
          onClick={() => onStateChange(getNextInsightsRailState(panel.state))}
          aria-label={panel.state === 'hidden' ? 'Open Thinking' : 'Close Thinking'}
          title={panel.state === 'hidden' ? 'Open Thinking' : 'Close Thinking'}
        >
          <ThinkingGlyph className="thinking-glyph" />
          <span className="ai-panel-toggle-label">Thinking</span>
        </button>

        <nav className="ai-mode-switch" aria-label="AI mode">
          {INSIGHTS_RAIL_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              className={panel.mode === mode ? 'active' : ''}
              onClick={() => onModeChange(mode)}
              aria-label={label}
              title={`${ACTION_LABELS[mode]} · ${label}`}
            >
              <span className="ai-mode-icon" aria-hidden="true">{getModeIcon(mode)}</span>
              <span className="ai-mode-label">{ACTION_LABELS[mode]}</span>
            </button>
          ))}
        </nav>
      </div>

      {isExpanded ? (
        <div className="ai-panel-body">
          <button type="button" className="ai-panel-resize" onPointerDown={beginResize} aria-label="Resize Thinking rail" />
          <div className="ai-panel-scroll">
            <header className="ai-panel-header ai-panel-header--context">
              <div className="ai-context-headline">
                <strong>Thinking</strong>
                <small>{selectedNote?.title ?? activeWorkspace?.name ?? activeProject?.name ?? `${visibleNotesCount} visible notes`}</small>
              </div>
              {activeResponse || lastAssistant || timelineSummary ? (
                <button type="button" className="ghost-button ai-why-toggle" onClick={() => setShowWhy((value) => !value)}>
                  {showWhy ? 'Hide why' : 'Why'}
                </button>
              ) : null}
            </header>

            {pendingAction ? (
              <div className="ai-action-preview">
                <strong>Ready</strong>
                <p>{pendingAction.label}</p>
                <div>
                  <button className="ghost-button" onClick={onCancelAction} type="button">Keep</button>
                  <button onClick={onConfirmAction} type="button">Apply</button>
                </div>
              </div>
            ) : null}

            {primaryMessage ? (
              <section className="ai-primary-response" aria-live="polite">
                <p>{primaryMessage}</p>
              </section>
            ) : (
              <section className="ai-idle-prompts" aria-label="Suggested prompts">
                <div className="ai-prompt-grid">
                  {promptSuggestions.slice(0, 3).map((prompt) => (
                    <button key={prompt} className="ai-prompt-card" onClick={() => onQueryChange(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {responseNotes.length ? (
              <section className="ai-related-strip" aria-label="Related notes">
                <div className="ai-reference-grid">
                  {responseNotes.map(({ result, note }) => {
                    if (!note) return null;
                    return (
                      <article key={note.id} className="ai-reference-card ai-reference-card--result">
                        <strong>{note.title ?? 'Untitled note'}</strong>
                        <span>{result.reasons[0] ?? 'Nearby context'}</span>
                        <div className="ai-inline-actions">
                          <button className="ghost-button" onClick={() => onOpenReference(note.id)} type="button">Open</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {showWhy ? (
              <section className="ai-why-panel">
                {timelineSummary ? (
                  <div className="ai-why-block">
                    <span className="ai-block-label">Recent shift</span>
                    <p>{timelineSummary}</p>
                  </div>
                ) : null}
                {activeResponse?.sections.length ? (
                  <div className="ai-why-block">
                    <span className="ai-block-label">Signals</span>
                    <ul>
                      {activeResponse.sections.map((section) => (
                        <li key={section.id}>
                          <strong>{section.title}</strong>
                          <span>{section.body}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {activeResponse?.actions?.length ? (
                  <div className="ai-action-chips">
                    {activeResponse.actions.map((action) => (
                      <button key={action.id} className="ghost-button" onClick={() => onPreviewAction(action)} type="button">
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <form className="ai-chat-shell" onSubmit={handleSubmit}>
            <div className="ai-query-row ai-query-row--inline">
              <input
                id="ai-query-input"
                className="ai-query-input"
                placeholder={placeholderForMode(panel.mode, selectedNote)}
                value={panel.query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
              <button type="submit" disabled={!panel.query.trim() || panel.loading || streaming}>
                {panel.loading || streaming ? 'Thinking…' : ACTION_LABELS[panel.mode]}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
