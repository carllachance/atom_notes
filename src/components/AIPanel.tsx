import { FormEvent, PointerEvent, useEffect, useMemo, useState } from 'react';
import { ThinkingGlyph } from './ThinkingGlyph';
import { ActionSuggestion, AIInteractionMode, AIPanelViewState, InsightTimelineEntry, InsightsResponse, NoteCardModel } from '../types';
import { AICommunicationState, ContentSource } from '../types/reeentory';

type ThinkingSuggestion = {
  id: string;
  title: string;
  meta: string;
};

function toDisplayText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => toDisplayText(item)).filter(Boolean).join(' ');
  if (value && typeof value === 'object' && 'text' in value) return toDisplayText((value as { text: unknown }).text);
  return '';
}

// DG-2 AN-015: AI Communication State Indicator
function AIStateIndicator({
  state,
  interactionMode,
  onInteractionModeChange
}: {
  state: AICommunicationState;
  interactionMode: 'live-stream' | 'review-before-send';
  onInteractionModeChange: (mode: 'live-stream' | 'review-before-send') => void;
}) {
  const stateConfig: Record<AICommunicationState, { label: string; colorClass: string }> = {
    idle: { label: 'Ready', colorClass: 'ai-state-idle' },
    sending: { label: 'Sending…', colorClass: 'ai-state-sending' },
    receiving: { label: 'Receiving…', colorClass: 'ai-state-receiving' },
    streaming: { label: 'Thinking…', colorClass: 'ai-state-streaming' },
    'review-mode': { label: 'Review', colorClass: 'ai-state-review' }
  };

  const config = stateConfig[state];

  return (
    <div className="ai-state-indicator" role="status" aria-live="polite">
      <span className={`ai-state-badge ${config.colorClass}`}>
        <span className="ai-state-dot" aria-hidden="true" />
        {config.label}
      </span>
      <div className="ai-mode-toggle" role="group" aria-label="AI interaction mode">
        <button
          className={`ai-mode-button ${interactionMode === 'live-stream' ? 'active' : ''}`}
          onClick={() => onInteractionModeChange('live-stream')}
          title="Live streaming - responses appear as they're generated"
        >
          Live
        </button>
        <button
          className={`ai-mode-button ${interactionMode === 'review-before-send' ? 'active' : ''}`}
          onClick={() => onInteractionModeChange('review-before-send')}
          title="Review before send - see full response before it's used"
        >
          Review
        </button>
      </div>
    </div>
  );
}

// DG-2 AN-013: AI Content Label for transparency
function AIContentLabel({ source }: { source: ContentSource }) {
  if (source === 'user-authored') return null;

  const labels: Record<ContentSource, { text: string; className: string }> = {
    'user-authored': { text: '', className: '' },
    'ai-generated': { text: 'AI-generated', className: 'ai-label-generated' },
    'ai-inferred': { text: 'AI-inferred', className: 'ai-label-inferred' },
    'ai-sourced': { text: 'Based on your notes', className: 'ai-label-sourced' }
  };

  const label = labels[source];

  return (
    <div className={`ai-content-label ${label.className}`} role="note">
      <span className="ai-content-label-icon" aria-hidden="true">
        <svg viewBox="0 0 12 12" width="10" height="10">
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <text x="6" y="9" textAnchor="middle" fontSize="8" fill="currentColor">i</text>
        </svg>
      </span>
      {label.text}
    </div>
  );
}

type AIPanelProps = {
  panel: AIPanelViewState;
  isOpen: boolean;
  selectedNote: NoteCardModel | null;
  contextLabel: string;
  notes: NoteCardModel[];
  streamedResponse: InsightsResponse | null;
  timelineEntries: InsightTimelineEntry[];
  streaming: boolean;
  pendingAction: ActionSuggestion | null;
  width: number;
  onToggle: () => void;
  onModeChange: (mode: AIInteractionMode) => void;
  onQueryChange: (query: string) => void;
  onRun: () => void;
  onOpenReference: (noteId: string) => void;
  onPreviewAction: (action: ActionSuggestion) => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onWidthChange: (width: number) => void;
  onInteractionModeChange: (mode: 'live-stream' | 'review-before-send') => void;
};

const RAIL_MIN_WIDTH = 320;
const RAIL_MAX_WIDTH = 520;

const ACTIONS: Array<{ mode: AIInteractionMode; label: string; icon: string }> = [
  { mode: 'ask', label: 'Ask', icon: '?' },
  { mode: 'explore', label: 'Why', icon: '◎' },
  { mode: 'act', label: 'Next', icon: '↗' }
];

function latestAssistantMessage(panel: AIPanelViewState) {
  return [...panel.transcript].reverse().find((entry) => entry.role === 'assistant') ?? null;
}

function summarizeTimeline(entries: InsightTimelineEntry[], noteId: string | null) {
  const noteEntries = noteId ? entries.filter((entry) => entry.noteId === noteId) : entries;
  const latest = [...noteEntries].sort((a, b) => b.createdAt - a.createdAt)[0];
  const title = toDisplayText(latest?.title);
  const detail = toDisplayText(latest?.detail);
  return latest ? [title, detail].filter(Boolean).join(': ') : '';
}

function placeholderForMode(mode: AIInteractionMode, selectedNote: NoteCardModel | null) {
  if (mode === 'explore') return selectedNote ? 'Why does this note matter right now?' : 'Why does this scope matter right now?';
  if (mode === 'act') return selectedNote ? 'What should happen next?' : 'What is the next useful move?';
  if (mode === 'summarize') return selectedNote ? 'Summarize this note' : 'Summarize this scope';
  return selectedNote ? 'Ask about this note' : 'Ask about the visible scope';
}

function buildSuggestions(
  response: InsightsResponse | null,
  notes: NoteCardModel[],
  fallbackLabel: string
): ThinkingSuggestion[] {
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const responseSuggestions = (response?.results ?? [])
    .map((result) => {
      const note = notesById.get(result.noteId);
      if (!note) return null;
      return {
        id: note.id,
        title: note.title ?? 'Untitled note',
        meta: toDisplayText(result.reasons?.[0]) || fallbackLabel
      } satisfies ThinkingSuggestion;
    })
    .filter((entry): entry is ThinkingSuggestion => Boolean(entry))
    .slice(0, 3);

  return responseSuggestions ?? [];
}

export function AIPanel({
  panel,
  isOpen,
  selectedNote,
  contextLabel,
  notes,
  streamedResponse,
  timelineEntries,
  streaming,
  pendingAction,
  width,
  onToggle,
  onModeChange,
  onQueryChange,
  onRun,
  onOpenReference,
  onPreviewAction,
  onConfirmAction,
  onCancelAction,
  onWidthChange,
  onInteractionModeChange
}: AIPanelProps) {
  const [showWhy, setShowWhy] = useState(false);
  const activeResponse = streamedResponse ?? panel.response;
  const lastAssistant = latestAssistantMessage(panel);
  const timelineSummary = summarizeTimeline(timelineEntries, selectedNote?.id ?? null);
  const primaryMessage = toDisplayText(activeResponse?.answer) || (streaming ? 'Thinking through the local context…' : toDisplayText(lastAssistant?.content)) || '';

  // DG-2 AN-015: Derive communication state from panel state
  const communicationState: AICommunicationState = streaming
    ? 'streaming'
    : panel.loading
      ? panel.communicationState === 'sending' ? 'sending' : 'receiving'
      : 'idle';

  const suggestionCards = useMemo(
    () => buildSuggestions(activeResponse, notes, 'Nearby context'),
    [activeResponse, notes]
  );
  const whyBullets = useMemo(() => {
    const bullets = [
      timelineSummary,
      ...((activeResponse?.sections ?? []).map((section) => {
        const sectionTitle = toDisplayText(section.title);
        const sectionBody = toDisplayText(section.body);
        return [sectionTitle, sectionBody].filter(Boolean).join(': ');
      }))
    ].filter(Boolean);
    return bullets.slice(0, 3);
  }, [activeResponse?.sections, timelineSummary]);

  useEffect(() => {
    setShowWhy(false);
  }, [selectedNote?.id, activeResponse?.answer, isOpen]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRun();
  };

  return (
    <aside
      className="ai-panel"
      data-open={isOpen ? 'true' : 'false'}
      style={{ ['--thinking-rail-width' as string]: `${width}px` }}
    >
      <div className="ai-panel-shell">
        <button
          className={`ai-panel-toggle ${isOpen ? 'active' : ''}`.trim()}
          onClick={onToggle}
          aria-label={isOpen ? 'Close Thinking rail' : 'Open Thinking rail'}
          title={isOpen ? 'Close Thinking rail' : 'Open Thinking rail'}
        >
          <ThinkingGlyph className="thinking-glyph" />
          <span>Thinking</span>
        </button>

        {isOpen ? (
          <button type="button" className="ai-panel-resize" onPointerDown={beginResize} aria-label="Resize Thinking rail" />
        ) : null}

        {isOpen ? (
          <div className="ai-panel-body">
            <header className="ai-panel-header">
              <div className="ai-panel-context">
                <strong>Thinking</strong>
                <small>{selectedNote?.title ?? contextLabel}</small>
              </div>

              {/* DG-2 AN-015: AI State Indicator */}
              <AIStateIndicator
                state={communicationState}
                interactionMode={panel.interactionMode}
                onInteractionModeChange={onInteractionModeChange}
              />

              <div className="ai-action-row" role="toolbar" aria-label="Thinking actions">
                {ACTIONS.map((action) => (
                  <button
                    key={action.mode}
                    type="button"
                    className={panel.mode === action.mode ? 'active' : ''}
                    onClick={() => {
                      onModeChange(action.mode);
                      if (action.mode === 'explore') setShowWhy((current) => !current);
                      if (action.mode !== 'explore') setShowWhy(false);
                    }}
                    aria-pressed={panel.mode === action.mode}
                    title={action.label}
                  >
                    <span aria-hidden="true">{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </header>

            {pendingAction ? (
              <section className="ai-action-preview">
                <strong>Ready to apply</strong>
                <p>{pendingAction.label}</p>
                <div className="ai-inline-actions">
                  <button className="ghost-button" onClick={onCancelAction} type="button">Keep note</button>
                  <button onClick={onConfirmAction} type="button">Apply</button>
                </div>
              </section>
            ) : null}

            {/* DG-2 AN-013: AI Content Labels */}
            <section className="ai-primary-response" aria-live="polite">
              {/* Show AI content label when there's a response */}
              {primaryMessage && <AIContentLabel source={lastAssistant?.contentSource ?? 'ai-generated'} />}
              <p>{primaryMessage || 'Ask for a quick read, the why behind the note, or the next move.'}</p>
              {whyBullets.length ? (
                <button type="button" className="ghost-button ai-why-toggle" onClick={() => setShowWhy((current) => !current)}>
                  {showWhy ? 'Hide why' : 'Why'}
                </button>
              ) : null}
            </section>

            {showWhy && whyBullets.length ? (
              <section className="ai-why-panel" aria-label="Why this surfaced">
                <ul>
                  {whyBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
                {activeResponse?.actions?.length ? (
                  <div className="ai-action-chips">
                    {activeResponse.actions.slice(0, 3).map((action) => (
                      <button key={action.id} className="ghost-button" onClick={() => onPreviewAction(action)} type="button">
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {suggestionCards.length ? (
              <section className="ai-suggestion-list" aria-label="Suggested notes">
                {suggestionCards.map((suggestion) => (
                  <article key={suggestion.id} className="ai-suggestion-card">
                    <div>
                      <strong>{suggestion.title}</strong>
                      <span>{suggestion.meta}</span>
                    </div>
                    <button className="ghost-button" onClick={() => onOpenReference(suggestion.id)} type="button">Open</button>
                  </article>
                ))}
              </section>
            ) : null}

            <form className="ai-chat-shell" onSubmit={handleSubmit}>
              <div className="ai-query-row">
                <input
                  id="ai-query-input"
                  className="ai-query-input"
                  placeholder={placeholderForMode(panel.mode, selectedNote)}
                  value={panel.query}
                  onChange={(event) => onQueryChange(event.target.value)}
                />
                <button type="submit" disabled={!panel.query.trim() || panel.loading || streaming}>
                  {panel.loading || streaming ? 'Thinking…' : 'Run'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
