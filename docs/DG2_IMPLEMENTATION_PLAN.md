# DG-2 Implementation Plan: Re-entry, Trust, and Transparency

**Author**: MiniMax Agent
**Date**: 2026-03-24
**Status**: Draft for Implementation
**DG**: DG-2 — Re-entry, Trust, and Transparency

---

## 1. Summary of Findings

### Existing Architecture

| Component | Current State | Relevant For |
|-----------|--------------|--------------|
| `RecallBand.tsx` | Has `recallCue` prop with "Where was I" chip | AN-007, AN-008, AN-009 |
| `AIPanel.tsx` | Has `streaming`, `loading` states | AN-013, AN-015, AN-016 |
| `sessionSlice.ts` | Has `recordTraversal()` and `useTraversalHistory()` | AN-008 |
| `useSceneController.ts` | Has `recallCue` derived state | AN-007, AN-010 |
| `types.ts` | Has `AITranscriptEntry`, `InsightTimelineEntry` | AN-013 |

### What Exists vs What Needs Building

**Already exists:**
- Basic `recallCue` in RecallBand with "Where was I" chip (simplistic)
- `TraversalEntry` type with `fromNoteId`, `toNoteId`, `at` fields
- `useTraversalHistory()` hook for recent note navigation
- `streaming` and `loading` states in AIPanel
- Labels for `mode` (ask/explore/act) in AIPanel

**Needs to be built:**
- Enhanced "Where Was I?" re-entry surface
- Resumable history stack with richer context
- AI-generated content labels (`generated`, `inferred`, `sourced`, `user-authored`)
- AI communication state indicators
- Observational tone enforcement

---

## 2. Assumptions

1. **History Stack**: We'll extend `TraversalEntry` to include `lensSnapshot`, `focusMode`, `activeNoteId` for richer state restoration
2. **AI Labels**: We'll add a `contentSource` type to `AITranscriptEntry` with values: `user-authored`, `ai-generated`, `ai-inferred`, `ai-sourced`
3. **AI States**: We'll extend AIPanel to show `idle`, `sending`, `receiving`, `streaming`, `review-mode` states
4. **Re-entry Surface**: We'll add a collapsible re-entry panel in RecallBand with history items and memory summary
5. **No backend changes**: All AI features are stubbed or use existing local-only inference

---

## 3. Files to Create/Update

### New Files
- `src/types/reeentory.ts` — New types for re-entry and state snapshots

### Files to Update
| File | Changes |
|------|---------|
| `src/types.ts` | Add `ContentSource` type, extend `AITranscriptEntry` |
| `src/store/sessionSlice.ts` | Extend history with state snapshots, add bookmarking |
| `src/scene/useSceneController.ts` | Wire up history, add re-entry surface state |
| `src/components/RecallBand.tsx` | Add re-entry surface panel |
| `src/components/AIPanel.tsx` | Add AI state indicators, content labels |
| `src/styles.css` | Add styles for re-entry surface, AI state badges |

---

## 4. State/Data Model Changes

### New Types (src/types/reeentory.ts)

```typescript
export type StateSnapshot = {
  id: string;
  label: string;
  createdAt: number;
  // Core state
  activeNoteId: string | null;
  lens: Lens;
  focusMode: FocusMode;
  // Context
  recentNoteIds: string[]; // Last 5 visited
  // AI summary placeholder
  memorySummary: string | null;
  summarySource: 'ai-generated' | 'ai-inferred' | null;
};

export type ReentrySurfaceState = {
  isExpanded: boolean;
  snapshots: StateSnapshot[];
  activeSnapshotId: string | null;
};

export type HistoryStackEntry = {
  id: string;
  timestamp: number;
  noteId: string | null;
  noteTitle: string | null;
  lensKind: string;
  focusMode: FocusMode;
  isPinned: boolean;
  label?: string;
};
```

### Extended Types (src/types.ts)

```typescript
// New: Content source for AI transparency
export type ContentSource = 'user-authored' | 'ai-generated' | 'ai-inferred' | 'ai-sourced';

// Extend AITranscriptEntry
export type AITranscriptEntry = {
  id: string;
  role: 'user' | 'assistant';
  mode: AIInteractionMode;
  content: string;
  createdAt: number;
  contentSource: ContentSource; // NEW
};

// New: AI communication state
export type AICommunicationState = 'idle' | 'sending' | 'receiving' | 'streaming' | 'review-mode';

// Extend AIPanelViewState
export type AIPanelViewState = {
  mode: AIInteractionMode;
  query: string;
  response: InsightsResponse | null;
  transcript: AITranscriptEntry[];
  loading: boolean;
  communicationState: AICommunicationState; // NEW
  interactionMode: 'live-stream' | 'review-before-send'; // NEW
};
```

---

## 5. Implementation Steps

### Phase 1A: Re-entry Surface (AN-007, AN-008, AN-009)

1. **Create `src/types/reeentory.ts`** with new types
2. **Update `src/types.ts`** with ContentSource and AICommunicationState
3. **Extend `sessionSlice.ts`**:
   - Add `historyStack: HistoryStackEntry[]` state
   - `recordHistoryEntry()` function with richer context
   - `addBookmark()` for pin functionality
   - `getHistoryStack()` and `useHistoryStack()` hook
4. **Update `RecallBand.tsx`**:
   - Add collapsible re-entry surface panel
   - Show recent history items
   - Show "jog my memory" summary placeholder
   - Wire up history navigation

### Phase 1B: AI Transparency (AN-013, AN-015, AN-016, AN-018)

5. **Update `AIPanel.tsx`**:
   - Add AI state indicator badge (idle/sending/receiving/streaming)
   - Add mode toggle (live-stream vs review-before-send)
   - Label AI-generated content with visual badge
   - Add privacy messaging in empty states
6. **Update `src/styles.css`** with:
   - `.ai-state-badge` styles
   - `.ai-content-label` styles
   - `.reentry-surface` styles
   - `.history-item` styles

---

## 6. Code Changes

### A. New Types File

```typescript
// src/types/reeentory.ts
import { FocusMode, Lens } from '../types';

export type StateSnapshot = {
  id: string;
  label: string;
  createdAt: number;
  activeNoteId: string | null;
  lens: Lens;
  focusMode: FocusMode;
  recentNoteIds: string[];
  memorySummary: string | null;
  summarySource: 'ai-generated' | 'ai-inferred' | null;
};

export type HistoryStackEntry = {
  id: string;
  timestamp: number;
  noteId: string | null;
  noteTitle: string | null;
  lensKind: string;
  focusMode: FocusMode;
  isPinned: boolean;
  label?: string;
};

export type ReentrySurfaceState = {
  isExpanded: boolean;
  history: HistoryStackEntry[];
  bookmarks: StateSnapshot[];
};
```

### B. RecallBand Enhancement (AN-007, AN-008)

```tsx
// Add to RecallBand.tsx - ReentrySurface component
function ReentrySurface({
  history,
  bookmarks,
  isExpanded,
  onToggle,
  onRestoreHistory,
  onAddBookmark,
  memorySummary,
  summarySource
}: {
  history: HistoryStackEntry[];
  bookmarks: StateSnapshot[];
  isExpanded: boolean;
  onToggle: () => void;
  onRestoreHistory: (entry: HistoryStackEntry) => void;
  onAddBookmark: () => void;
  memorySummary: string | null;
  summarySource: ContentSource | null;
}) {
  return (
    <div className="reentry-surface">
      <button
        className="ghost-button reentry-toggle"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span className="reentry-icon">↺</span>
        Where was I?
      </button>

      {isExpanded && (
        <div className="reentry-panel">
          {/* Jog My Memory Summary */}
          {memorySummary && (
            <section className="reentry-summary">
              <div className="summary-label">
                <span className="ai-badge">AI-generated</span>
                Summary
              </div>
              <p>{memorySummary}</p>
            </section>
          )}

          {/* Recent History */}
          <section className="reentry-history">
            <label>Recent</label>
            {history.slice(0, 5).map((entry) => (
              <button
                key={entry.id}
                className="history-item"
                onClick={() => onRestoreHistory(entry)}
              >
                <span className="history-note">{entry.noteTitle || 'Untitled'}</span>
                <span className="history-time">
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </button>
            ))}
          </section>

          {/* Bookmarks (Pins) */}
          {bookmarks.length > 0 && (
            <section className="reentry-bookmarks">
              <label>Pins</label>
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bookmark-item">
                  <span>{bookmark.label}</span>
                  <button onClick={() => restoreBookmark(bookmark)}>Restore</button>
                </div>
              ))}
            </section>
          )}

          <button className="ghost-button" onClick={onAddBookmark}>
            Drop a pin here
          </button>
        </div>
      )}
    </div>
  );
}
```

### C. AIPanel Enhancement (AN-013, AN-015, AN-016)

```tsx
// Add to AIPanel.tsx - AI State Indicator
function AIStateIndicator({ state, interactionMode }: {
  state: AICommunicationState;
  interactionMode: 'live-stream' | 'review-before-send';
}) {
  const stateConfig = {
    idle: { label: 'Ready', color: 'neutral' },
    sending: { label: 'Sending…', color: 'sending' },
    receiving: { label: 'Receiving…', color: 'receiving' },
    streaming: { label: 'Thinking…', color: 'streaming' },
    'review-mode': { label: 'Review mode', color: 'review' }
  };

  const config = stateConfig[state];

  return (
    <div className="ai-state-indicator">
      <span className={`ai-state-badge ai-state-${config.color}`}>
        {config.label}
      </span>
      {interactionMode === 'review-before-send' && (
        <span className="ai-mode-badge">Review</span>
      )}
    </div>
  );
}

// Add to AIPanel - Content Labels
function AIResponseContent({ content, source }: {
  content: string;
  source: ContentSource;
}) {
  if (source === 'user-authored') return <p>{content}</p>;

  return (
    <div className="ai-content">
      <div className={`ai-content-label ai-content-${source}`}>
        {source === 'ai-generated' && 'AI-generated'}
        {source === 'ai-inferred' && 'AI-inferred'}
        {source === 'ai-sourced' && 'Based on your notes'}
      </div>
      <p>{content}</p>
    </div>
  );
}
```

---

## 7. Acceptance Criteria

### AN-007: "Where Was I?" Re-entry Surface
- [ ] Re-entry surface toggle visible in RecallBand
- [ ] Clicking shows recent history (last 5 items)
- [ ] History items show note title and relative time
- [ ] Clicking history item restores that state

### AN-008: Resumable History Stack
- [ ] Navigation to notes creates history entries
- [ ] History includes note title, lens state, timestamp
- [ ] History persists across session

### AN-009: State Bookmarking
- [ ] "Drop a pin" button creates named snapshot
- [ ] Pins accessible from re-entry surface
- [ ] Restoring pin restores full state

### AN-013: AI Content Labels
- [ ] AI-generated responses have visible label badge
- [ ] Labels distinguish generated vs inferred vs sourced
- [ ] Consistent visual treatment across all AI surfaces

### AN-015: AI Communication States
- [ ] Visible indicator for sending/receiving/streaming
- [ ] Idle state clearly indicated
- [ ] State changes are immediate and visible

### AN-016: Review Mode Support
- [ ] Toggle between live-stream and review-before-send
- [ ] Review mode shows full response before commitment
- [ ] Mode selection persists

### AN-018: Privacy Messaging
- [ ] Empty/placeholder states mention local-first
- [ ] Copy is calm, not alarmist
- [ ] No scary language about data collection

---

## 8. Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| History stack grows unbounded | Limit to 20 items, auto-prune oldest |
| Memory summary generation is expensive | Stub with placeholder, add async generation later |
| Bookmark conflicts with scene persistence | Bookmarks stored separately from scene |
| AI state indicators confusing | Use clear labels, consistent iconography |
| Review mode requires backend changes | Stub mode toggle, wire up later |

---

## 9. Stub Implementation Notes

### Memory Summary (AN-010)
- **Stub**: Show placeholder "Your summary will appear here"
- **Future**: Wire to AI inference layer for actual generation

### Horizon View (AN-011)
- **Stub**: Not implemented in Phase 1
- **Future**: Add after establishing re-entry foundation

### Trust Color Palette (AN-017)
- **Stub**: Use semantic CSS classes, defer color mapping
- **Future**: Define full palette in tokens.css
