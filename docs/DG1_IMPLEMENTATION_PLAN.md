# DG-1 Implementation Plan: Make It Usable and Calm

**Author**: MiniMax Agent
**Date**: 2026-03-24
**Status**: Draft for Review

---

## Executive Summary

This plan addresses DG-1's goal to stabilize the workspace and reduce visual noise. Based on codebase analysis, the primary intervention points are:

1. **RecallBand.tsx** - Consolidate 12+ controls into 3 contextual zones
2. **ExpandedNote.tsx** - Enforce calm default layout, stabilize panel positioning
3. **AIPanel.tsx** - Simplify action modes, reduce cognitive load
4. **Keyboard handlers** - Restore double-tap Ctrl gesture
5. **Global reset** - Single "Show all notes" action with clear labeling

---

## EPIC Definitions (Implementation-Ready)

### EPIC-001: Core Workspace Simplification and Layout Stability

**Stories**:

| ID | Story | Files to Update |
|----|-------|-----------------|
| ST-001 | RecallBand consolidation: Group controls into [primary actions], [scope], [transient filters] | `src/components/RecallBand.tsx` |
| ST-002 | Panel positioning: Persist note panel offset, prevent jumpy repositioning | `src/App.tsx`, `src/components/ExpandedNote.tsx` |
| ST-003 | Calm default: Ensure ExpandedNote opens in read mode, not edit, by default | `src/components/ExpandedNote.tsx` |
| ST-004 | Global reset: Add "Show all notes" as primary action, not buried recovery | `src/components/RecallBand.tsx`, `src/scene/canvasVisibility.ts` |

### EPIC-008: Graph and Visual Interaction Quality

**Stories**:

| ID | Story | Files to Update |
|----|-------|-----------------|
| ST-005 | Relationship chips: Move from constellation detail to visible placement in note header | `src/components/ExpandedNote.tsx`, `src/components/NoteCard.tsx` |
| ST-006 | Graph rendering: Reduce clutter, limit visible connections to 8 max | `src/components/RelationshipWeb.tsx` |
| ST-007 | Focus behavior: Make "Highlight Focus" the default, "Focus only" as explicit opt-in | `src/components/RecallBand.tsx` |
| ST-008 | Double-tap restore: Re-enable Ctrl double-tap to open last note | `src/scene/useSceneController.ts`, `src/components/CaptureComposer.tsx` |

### EPIC-009: Synthetic Demo Data and Onboarding Readiness

**Stories**:

| ID | Story | Files to Create/Update |
|----|-------|------------------------|
| ST-009 | Demo dataset: Create 5-7 sample notes with relationships, one workspace, one project | `src/demo/syntheticDemoData.ts` (new) |
| ST-010 | Onboarding prompt: "Start here" chip with demo load option on empty state | `src/components/HomeSurface.tsx` |
| ST-011 | Reset to demo: Ability to restore demo state for demos/fresh start | `src/store/demoSlice.ts` (new), `src/scene/useSceneController.ts` |

---

## Detailed Implementation

### ST-001: RecallBand Consolidation

**Problem**: RecallBand.tsx renders 12+ controls simultaneously (lens nav, focus toggles, project/workspace selects, reveal, canvas recovery, capture button).

**Solution**: Group into 3 contextual zones with progressive disclosure.

#### Zone Map

| Zone | Contents | Visibility |
|------|----------|------------|
| **Primary** (always visible) | Note count, Capture button, "Show all notes" | Always |
| **Scope** (contextual) | Lens nav (Universe/Project/Workspace/Archive), active lens label | When not in Universe |
| **Filters** (collapsed by default) | Focus toggles, project/workspace selects, reveal | Collapsed behind "Filters" button |

#### Changes to `src/components/RecallBand.tsx`

```typescript
// New component structure
function RecallBandPrimaryZone({ count, totalCount, onClearFilters, canClearFilters }) {
  return (
    <div className="recall-band__primary-zone">
      <span>{count} notes{totalCount !== count ? ` of ${totalCount}` : ''}</span>
      {/* Primary actions only */}
      {canClearFilters && (
        <button onClick={onClearFilters} className="ghost-button">
          Show all notes
        </button>
      )}
    </div>
  );
}

function RecallBandScopeZone({ lens, projects, workspaces, onSetLens }) {
  const isActive = lens.kind !== 'universe';
  return (
    <nav className="recall-band__scope-zone" aria-label="Lens selection" data-visible={isActive ? 'true' : 'false'}>
      <button className={lens.kind === 'universe' ? 'active' : ''} onClick={() => onSetLens({ kind: 'universe' })}>
        Universe
      </button>
      <button className={lens.kind === 'project' ? 'active' : ''} onClick={() => onSetLens({ kind: 'project', ... })}>
        Project
      </button>
      <button className={lens.kind === 'workspace' ? 'active' : ''} onClick={() => onSetLens({ kind: 'workspace', ... })}>
        Workspace
      </button>
      <button className={lens.kind === 'archive' ? 'active' : ''} onClick={() => onSetLens({ kind: 'archive' })}>
        Archive
      </button>
      {isActive && <span className="active-lens-badge">{getLensLabel(lens)}</span>}
    </nav>
  );
}

function RecallBandFiltersZone({ focusMode, focusCount, projects, workspaces, revealQuery, ... }) {
  // Hidden behind "Filters" toggle button
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="recall-band__filters-zone">
      <button
        className="ghost-button filters-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        Filters {focusMode.highlight || focusMode.isolate ? '(active)' : ''}
      </button>
      {expanded && (
        <div className="filters-panel">
          {/* Focus controls */}
          <div className="focus-controls">
            <button className={focusMode.highlight ? 'active' : ''} onClick={() => onSetFocusMode({ highlight: !focusMode.highlight })}>
              Highlight Focus
            </button>
            <button className={focusMode.isolate ? 'active' : ''} onClick={() => onSetFocusMode({ isolate: !focusMode.isolate })}>
              Focus only
            </button>
          </div>
          {/* Project/Workspace selects */}
          {/* Reveal controls */}
          {/* Canvas recovery */}
        </div>
      )}
    </div>
  );
}
```

#### CSS Changes

```css
/* src/styles/recall-band.css */

.recall-band {
  /* Simplified flex layout */
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 16px;
  min-height: 48px;
}

.recall-band__primary-zone {
  display: flex;
  gap: 12px;
  align-items: center;
}

.recall-band__scope-zone {
  display: flex;
  gap: 8px;
  align-items: center;
  /* Hidden by default, shown via data attribute */
}

.recall-band__scope-zone[data-visible="false"] {
  display: none;
}

.recall-band__filters-zone {
  margin-left: auto;
}

.filters-toggle {
  font-size: 13px;
}

.filters-panel {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 280px;
  box-shadow: var(--shadow-elevated);
}
```

**Acceptance Criteria**:
- [ ] RecallBand renders no more than 3 visible zones when in Universe lens
- [ ] "Show all notes" is a primary action, not buried in recovery
- [ ] Focus toggles are collapsed by default
- [ ] Project/Workspace selects are collapsed by default

---

### ST-002: Panel Positioning Stability

**Problem**: Note panel position jumps on every open, especially when `initialPosition` is `{ x: 0, y: 0 }`.

**Solution**: Persist panel offset in session state, use last position as anchor.

#### Changes to `src/App.tsx`

```typescript
// Add to App.tsx
const [notePanelPositions, setNotePanelPositions] = useState<Record<string, { x: number; y: number }>>({});

// In expandedNoteProps:
initialPosition: activeNote
  ? notePanelPositions[activeNote.id] ?? { x: 0, y: 0 }
  : undefined,
onPositionChange: (noteId, position) => {
  setNotePanelPositions((current) => ({
    ...current,
    [noteId]: position
  }));
}
```

#### Changes to `src/components/ExpandedNote.tsx`

```typescript
// In useEffect for position reset, preserve offset from session:
useEffect(() => {
  // Use session-persisted position if available, otherwise center
  const anchorPosition = initialPosition ?? { x: 0, y: 0 };
  setPosition(anchorPosition);
  // ... rest of reset
}, [initialPosition, note?.id]);

// In clamp function, use more conservative bounds:
function getClampedPanelPosition(position, panel, rightInset, bottomInset) {
  const panelWidth = panel?.offsetWidth ?? 760;
  const panelHeight = panel?.offsetHeight ?? 760;

  // Prevent panel from going off-screen
  const maxX = window.innerWidth - panelWidth - rightInset - 24;
  const minX = -window.innerWidth / 2 + panelWidth / 2 + 24;
  const maxY = window.innerHeight - panelHeight - bottomInset - 24;
  const minY = -window.innerHeight / 2 + panelHeight / 2 + 24;

  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY)
  };
}
```

**Acceptance Criteria**:
- [ ] Opening the same note twice positions it in the same spot
- [ ] Panel never renders partially off-screen
- [ ] Position persists across note opens within session

---

### ST-003: Calm Default Layout

**Problem**: New notes open in edit mode (`trace === 'captured'` triggers edit).

**Solution**: Open in read mode by default, edit only on explicit action.

#### Changes to `src/components/ExpandedNote.tsx`

```typescript
// Change from:
setPanelMode(note?.trace === 'captured' ? 'edit' : 'read');

// To:
setPanelMode('read'); // Always start in read mode
```

#### Update expanded note header to be calmer by default

```typescript
// In the header class, ensure --calm variant is default
<header className="expanded-note-header expanded-note-header--calm">
```

**Acceptance Criteria**:
- [ ] All notes open in read mode by default
- [ ] Edit mode requires explicit "Edit" button click
- [ ] Captured notes do not auto-switch to edit mode

---

### ST-004: Global Reset as Primary Action

**Problem**: "Show all notes" is buried in canvas recovery helper.

**Solution**: Prominently place "Show all notes" as a primary RecallBand action.

#### Changes to `src/components/RecallBand.tsx`

```typescript
// In primary zone:
<button
  className="ghost-button primary-action"
  onClick={onClearFilters}
  disabled={!canClearFilters}
>
  Show all notes
</button>
```

#### CSS

```css
.primary-action {
  font-weight: 600;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
}

.primary-action:not(:disabled):hover {
  background: var(--surface-hover);
}
```

**Acceptance Criteria**:
- [ ] "Show all notes" button is visible in primary zone
- [ ] Button is disabled only when already showing all notes
- [ ] Clicking it restores Universe lens, clears focus mode, clears reveal

---

### ST-005: Relationship Chips in Visible Placement

**Problem**: Relationships are only visible in constellation mode or collapsed trace.

**Solution**: Show primary relationship chips in note header, below title.

#### Changes to `src/components/ExpandedNote.tsx`

```typescript
// Add to read mode layout, below note-title-field:
<div className="note-relationship-chips" aria-label="Related notes">
  {visibleTraceNotes.slice(0, 3).map((relationship) => (
    <button
      key={relationship.relationshipId}
      className="relationship-chip"
      onClick={() => onOpenRelated(relationship.targetId, relationship.relationshipId)}
    >
      <span className="relationship-chip__type">
        {formatRelationshipType(relationship.relationship.type)}
      </span>
      <span className="relationship-chip__title">
        {relationship.targetTitle}
      </span>
    </button>
  ))}
  {traceOverflow > 0 && (
    <button
      className="relationship-chip relationship-chip--overflow"
      onClick={() => setPanelMode('constellation')}
    >
      +{traceOverflow} more
    </button>
  )}
</div>
```

#### CSS

```css
.note-relationship-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 12px;
}

.relationship-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms ease;
}

.relationship-chip:hover {
  background: var(--surface-hover);
}

.relationship-chip__type {
  color: var(--text-secondary);
  text-transform: capitalize;
}

.relationship-chip__title {
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Acceptance Criteria**:
- [ ] Up to 3 relationship chips visible in note header
- [ ] Chips are clickable and open related note
- [ ] Overflow count links to constellation mode

---

### ST-006: Graph Rendering Clarity

**Problem**: RelationshipWeb shows up to 10 connections, causing visual clutter.

**Solution**: Limit visible connections, use progressive disclosure.

#### Changes to `src/components/RelationshipWeb.tsx`

```typescript
// Change from:
.slice(0, 10)

// To:
.slice(0, 6)
```

#### Add "Show more connections" affordance

```typescript
const VISIBLE_LIMIT = 6;

const visibleTargets = useMemo(() => {
  const filtered = relatedNotes.filter(
    (item) => item.degree === 1 && (filter === 'all' || item.relationship.type === filter)
  );

  return filtered
    .sort((a, b) => b.score - a.score) // Prioritize by relevance score
    .slice(0, VISIBLE_LIMIT)
    .map((item) => {
      // ... existing mapping
    })
    .filter(Boolean);
}, [/* ... */]);

const hasOverflow = relatedNotes.filter(
  (item) => item.degree === 1
).length > VISIBLE_LIMIT;
```

**Acceptance Criteria**:
- [ ] Maximum 6 visible connections in RelationshipWeb
- [ ] Connections prioritized by relevance score
- [ ] Overflow indicated visually

---

### ST-007: Focus Behavior Defaults

**Problem**: "Focus only" mode is too aggressive for new users.

**Solution**: Make "Highlight Focus" the default (subtle), "Focus only" requires explicit opt-in.

#### Changes to `src/components/RecallBand.tsx`

```typescript
// Default focusMode in scene state:
const initialFocusMode = { highlight: true, isolate: false };

// In RecallBand, show "Highlight Focus" as active by default:
<button
  className={`ghost-button ${focusMode.highlight ? 'active' : ''}`}
  onClick={() => onSetFocusMode({ highlight: !focusMode.highlight })}
>
  Highlight Focus
</button>

// "Focus only" gets a confirmation or secondary styling:
<button
  className={`ghost-button focus-only-toggle ${focusMode.isolate ? 'active' : ''}`}
  onClick={() => onSetFocusMode({ isolate: !focusMode.isolate })}
  title="Hides non-focus notes. Use Highlight Focus for a gentler view."
>
  Focus only
</button>
```

#### CSS

```css
.focus-only-toggle {
  opacity: 0.7;
}

.focus-only-toggle.active {
  opacity: 1;
  background: var(--surface-emphasis);
}
```

**Acceptance Criteria**:
- [ ] Focus mode defaults to `highlight: true, isolate: false`
- [ ] "Focus only" has subdued styling until activated
- [ ] Tooltip explains the difference

---

### ST-008: Double-Tap Ctrl Gesture

**Problem**: Quick re-entry gesture (Ctrl double-tap) is not working or documented.

**Solution**: Implement in CaptureComposer and App keyboard handlers.

#### Changes to `src/components/CaptureComposer.tsx`

```typescript
// Add double-tap detection:
const lastTapRef = useRef<number>(0);
const DOUBLE_TAP_DELAY = 300; // ms

useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Control' || event.ctrlKey) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
        // Double-tap detected
        event.preventDefault();
        // Open last note if available
        if (lastCreatedNoteId) {
          onOpenNote(lastCreatedNoteId);
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [lastCreatedNoteId, onOpenNote]);
```

**Acceptance Criteria**:
- [ ] Ctrl double-tap opens last created note
- [ ] Works from anywhere in the app
- [ ] Single Ctrl-tap opens capture composer (existing behavior)

---

### ST-009: Demo Dataset

**Problem**: New users see empty canvas, no sense of the graph model.

**Solution**: Create synthetic demo data with 5-7 interconnected notes.

#### New File: `src/demo/syntheticDemoData.ts`

```typescript
import { NoteCardModel, Relationship, Project, Workspace } from '../types';
import { nanoid } from 'nanoid';

export function createSyntheticDemoData(): {
  notes: NoteCardModel[];
  relationships: Relationship[];
  projects: Project[];
  workspaces: Workspace[];
} {
  const now = Date.now();
  const DAY = 86400000;

  // Create workspace
  const workspaceId = nanoid();
  const workspace: Workspace = {
    id: workspaceId,
    key: 'DEMO',
    name: 'Getting Started',
    description: 'A sample workspace to explore Atom Notes',
    color: '#5fbf97',
    createdAt: now - 7 * DAY,
    updatedAt: now - 2 * DAY
  };

  // Create project
  const projectId = nanoid();
  const project: Project = {
    id: projectId,
    key: 'EXPLORE',
    name: 'Exploring Atom Notes',
    description: 'Learn how notes connect',
    color: '#7aa2f7',
    createdAt: now - 6 * DAY,
    updatedAt: now - 1 * DAY
  };

  // Create notes
  const notes: NoteCardModel[] = [
    {
      id: nanoid(),
      title: 'Welcome to Atom Notes',
      body: 'This is your starting point. Notes in Atom Notes are connected through relationships, not just folders.\n\nTry these other notes to see how they link together.',
      intent: 'note',
      x: 400,
      y: 300,
      z: 0,
      workspaceId,
      projectIds: [projectId],
      createdAt: now - 7 * DAY,
      updatedAt: now - 1 * DAY,
      trace: 'captured'
    },
    {
      id: nanoid(),
      title: 'Quick capture idea',
      body: 'Double-tap Ctrl to capture a thought quickly. The first line becomes the title.',
      intent: 'note',
      x: 200,
      y: 200,
      z: 1,
      workspaceId,
      projectIds: [projectId],
      createdAt: now - 6 * DAY,
      updatedAt: now - 3 * DAY,
      trace: 'captured'
    },
    {
      id: nanoid(),
      title: 'Try this task',
      body: '- [ ] Mark this task as done\n- [ ] Create a new note\n- [ ] Link two notes together',
      intent: 'task',
      taskState: 'open',
      x: 600,
      y: 200,
      z: 2,
      workspaceId,
      projectIds: [projectId],
      createdAt: now - 5 * DAY,
      updatedAt: now - 2 * DAY,
      trace: 'captured'
    },
    {
      id: nanoid(),
      title: 'How notes connect',
      body: 'Notes can be linked with different relationship types:\n- **related** - general connection\n- **supports** - adds evidence\n- **depends_on** - needs another note\n\nOpen the Constellation view to see the graph.',
      intent: 'note',
      x: 200,
      y: 450,
      z: 3,
      workspaceId,
      projectIds: [projectId],
      createdAt: now - 4 * DAY,
      updatedAt: now - 1 * DAY,
      trace: 'captured'
    },
    {
      id: nanoid(),
      title: 'Focus mode explained',
      body: 'Mark important notes as Focus. Use "Highlight Focus" to see them across the canvas, or "Focus only" to see just those notes.',
      intent: 'note',
      x: 600,
      y: 450,
      z: 4,
      workspaceId,
      projectIds: [projectId],
      isFocus: true,
      createdAt: now - 3 * DAY,
      updatedAt: now - 1 * DAY,
      trace: 'captured'
    }
  ];

  // Create relationships
  const relationships: Relationship[] = [
    {
      id: nanoid(),
      fromId: notes[0].id,
      toId: notes[1].id,
      type: 'related',
      state: 'confirmed',
      explicitness: 'explicit',
      directional: false,
      confidence: 0.9,
      explanation: 'Part of the quick start sequence',
      heuristicSupported: true,
      createdAt: now - 6 * DAY,
      lastActiveAt: now - 2 * DAY
    },
    {
      id: nanoid(),
      fromId: notes[0].id,
      toId: notes[2].id,
      type: 'related',
      state: 'confirmed',
      explicitness: 'explicit',
      directional: false,
      confidence: 0.85,
      explanation: 'Suggested next step',
      heuristicSupported: true,
      createdAt: now - 5 * DAY,
      lastActiveAt: now - 1 * DAY
    },
    {
      id: nanoid(),
      fromId: notes[0].id,
      toId: notes[3].id,
      type: 'leads_to',
      state: 'confirmed',
      explicitness: 'explicit',
      directional: true,
      confidence: 0.8,
      explanation: 'Deeper dive',
      heuristicSupported: true,
      createdAt: now - 4 * DAY,
      lastActiveAt: now - 1 * DAY
    },
    {
      id: nanoid(),
      fromId: notes[3].id,
      toId: notes[4].id,
      type: 'supports',
      state: 'confirmed',
      explicitness: 'explicit',
      directional: true,
      confidence: 0.75,
      explanation: 'Expands on focus concept',
      heuristicSupported: true,
      createdAt: now - 3 * DAY,
      lastActiveAt: now - 1 * DAY
    }
  ];

  return { notes, relationships, projects: [project], workspaces: [workspace] };
}
```

**Acceptance Criteria**:
- [ ] Demo data includes 5 notes with varied intents
- [ ] Notes are interconnected with meaningful relationships
- [ ] One workspace and one project are created

---

### ST-010: Onboarding Prompt

**Problem**: Empty state shows nothing, users don't know where to start.

**Solution**: Add "Start here" chip with demo load option.

#### Changes to `src/components/HomeSurface.tsx`

```typescript
type HomeSurfaceProps = {
  // ... existing props
  onLoadDemo?: () => void;
  hasDemoData?: boolean;
};

export function HomeSurface({
  // ... existing destructuring
  onLoadDemo,
  hasDemoData = false
}: HomeSurfaceProps) {
  // ... existing logic

  return (
    <section className="home-surface home-surface--light" aria-label="Workspace overview">
      {hasResume ? (
        // ... existing resume section
      ) : (
        <section className="home-surface__empty-prompt" aria-label="Start capturing">
          <span className="home-surface__eyebrow">Start here</span>
          <strong>Your first note can stay small.</strong>
          <p className="home-surface__hint">
            Double-tap Ctrl to capture a thought, or load sample data to explore.
          </p>
          {onLoadDemo && (
            <button
              type="button"
              className="ghost-button demo-load-button"
              onClick={onLoadDemo}
            >
              Load sample notes
            </button>
          )}
        </section>
      )}
      {/* ... rest of component */}
    </section>
  );
}
```

#### CSS

```css
.home-surface__empty-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.home-surface__eyebrow {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.home-surface__empty-prompt strong {
  font-size: 20px;
  margin-bottom: 12px;
}

.home-surface__hint {
  color: var(--text-secondary);
  max-width: 280px;
  margin-bottom: 16px;
}

.demo-load-button {
  padding: 8px 16px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
}
```

**Acceptance Criteria**:
- [ ] Empty state shows "Start here" with hint text
- [ ] "Load sample notes" button visible when no notes exist
- [ ] Clicking loads demo data and shows "Where was I" resume

---

### ST-011: Reset to Demo State

**Problem**: No way to restore demo state after clearing data.

**Solution**: Add demo reset to scene controller.

#### Changes to `src/scene/useSceneController.ts`

```typescript
// Add to useSceneController return:
const loadDemoData = useCallback(() => {
  const demo = createSyntheticDemoData();
  dispatch({ type: 'LOAD_DEMO_DATA', payload: demo });
}, [dispatch]);

// In reducer:
case 'LOAD_DEMO_DATA': {
  return {
    ...state,
    notes: action.payload.notes,
    relationships: action.payload.relationships,
    projects: action.payload.projects,
    workspaces: action.payload.workspaces
  };
}
```

#### Add keyboard shortcut: Ctrl+Shift+R for reset

```typescript
// In App.tsx useEffect:
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      loadDemoData();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [loadDemoData]);
```

**Acceptance Criteria**:
- [ ] Ctrl+Shift+R loads demo data
- [ ] Demo load button in empty state triggers same action
- [ ] Existing data is replaced (not merged)

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `src/demo/syntheticDemoData.ts` | Demo dataset generator |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/RecallBand.tsx` | Consolidate zones, add filters toggle |
| `src/components/ExpandedNote.tsx` | Calm default, relationship chips, position stability |
| `src/components/HomeSurface.tsx` | Onboarding prompt with demo load |
| `src/components/RelationshipWeb.tsx` | Reduce visible connections to 6 |
| `src/components/AIPanel.tsx` | Minor cleanup (no major changes needed) |
| `src/App.tsx` | Panel position persistence, keyboard shortcuts |
| `src/scene/useSceneController.ts` | Demo data loading action |

---

## Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| RecallBand consolidation hides important controls | Ensure all controls remain accessible via filters panel |
| Panel position persistence causes layout issues on different screens | Use conservative clamping bounds |
| Demo data overwrites user data | Show confirmation dialog before demo load |
| Graph simplification loses context | Limit to relevance-sorted connections, show overflow count |

---

## Implementation Order

1. **Phase 1**: RecallBand consolidation (ST-001, ST-004)
2. **Phase 2**: Note panel stability (ST-002, ST-003)
3. **Phase 3**: Visual improvements (ST-005, ST-006, ST-007)
4. **Phase 4**: Keyboard shortcuts (ST-008)
5. **Phase 5**: Demo data and onboarding (ST-009, ST-010, ST-011)

---

## Verification

After each story:
1. Run `npm run build` to verify no type errors
2. Test in browser:
   - Empty state shows onboarding
   - Demo load creates connected notes
   - RecallBand has max 3 visible zones
   - Note panel position persists across opens
   - Double-tap Ctrl opens last note
