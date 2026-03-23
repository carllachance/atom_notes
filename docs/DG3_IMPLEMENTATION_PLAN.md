# DG-3 Implementation Plan: Tasks, Relationships, and AI Editing

**Author**: MiniMax Agent
**Date**: 2026-03-24
**Status**: Draft for Implementation
**DG**: DG-3 — Tasks, Relationships, and AI Editing

---

## 1. Summary of Findings

### Existing Architecture

| Component | Current State | Relevant For |
|-----------|--------------|--------------|
| `ExpandedNote.tsx` | Has full constellation mode, relationship inspector, task promotion UI | EPIC-004, EPIC-005, EPIC-007 |
| `InlineNoteLinkEditor.tsx` | Handles inline link creation and relationship management | EPIC-005 |
| `RefinementComposer.tsx` | AI-powered text transformation with presets | EPIC-007 |
| `taskPromotions.ts` | Task fragment resolution and state management | EPIC-004 |
| `actionFragmentSuggestions.ts` | Likely action fragment detection | EPIC-004 |
| `relationshipActions.ts` | Relationship CRUD operations | EPIC-005 |
| `useSceneController.ts` | Scene state and mutations | All epics |
| `useSceneMutations.ts` | Mutation callbacks | All epics |

### What Exists vs What Needs Building

**Already exists:**
- Task creation from text fragments via `promoteNoteFragmentToTask`
- Task state management (open/done) via `setTaskState`
- Full relationship system with explicit/inferred, proposed/confirmed states
- Relationship inspector with type editing and directionality
- Constellation mode with RelationshipGraph visualization
- AI refinement presets (clarify, summarize, bulletize, etc.)
- RefinementComposer with preview and apply workflow
- InlineNoteLinkEditor with proactive link suggestions

**Needs to be built (DG-3 Phase 1):**
- Proper `contentSource` tracking in AI transcript entries (DG-2)
- CSS styling for task-related UI components
- Relationship inspector modal styling
- Refinement preview styling

---

## 2. Files to Create/Update

### Files to Update
| File | Changes |
|------|---------|
| `src/scene/useSceneController.ts` | Add `contentSource` to transcript entries |
| `src/styles.css` | Add DG-3 styles for tasks, relationships, AI editing |
| `docs/DG3_IMPLEMENTATION_PLAN.md` | This implementation plan |

---

## 3. State/Data Model Changes

### Extended Types (src/types.ts)

```typescript
// Already defined in types.ts:
export type NoteIntent = 'task' | 'link' | 'code' | 'note';
export type TaskState = 'open' | 'done';

export type AITranscriptEntry = {
  id: string;
  role: 'user' | 'assistant';
  mode: AIInteractionMode;
  content: string;
  createdAt: number;
  contentSource: 'user-authored' | 'ai-generated' | 'ai-inferred' | 'ai-sourced';
};
```

---

## 4. Implementation Steps

### Phase 1A: Fix AI Content Source Tracking (DG-2 Carryover)

1. **Update `src/scene/useSceneController.ts`**:
   - Add `contentSource: 'user-authored'` to user entries in transcript
   - Add `contentSource: 'ai-generated'` to assistant entries in transcript

### Phase 1B: Add DG-3 UI Styles

2. **Update `src/styles.css`**:
   - Add `.inline-task-strip` and `.inline-task-strip-chip` styles
   - Add task state variants (`--open`, `--done`)
   - Add `.task-origin-card` styles
   - Add `.relationship-inspector--modal` styles
   - Add `.refinement-preview` styles
   - Add `.refinement-preset-button` styles

---

## 5. Code Changes

### A. Transcript Entry Content Source (useSceneController.ts)

```typescript
// User entry
const userEntry = {
  id: crypto.randomUUID(),
  role: 'user' as const,
  mode: scene.aiPanel.mode,
  content: query,
  createdAt: now(),
  contentSource: 'user-authored' as const
};

// Assistant entry
const assistantEntry = {
  id: crypto.randomUUID(),
  role: 'assistant' as const,
  mode: scene.aiPanel.mode,
  content: response.answer,
  createdAt: now(),
  contentSource: 'ai-generated' as const
};
```

### B. CSS Styles (styles.css)

Added comprehensive styles for:
- Inline task strip chips with open/done variants
- Task origin cards
- Relationship inspector modal
- Refinement preview panels
- AI refinement preset buttons

---

## 6. Acceptance Criteria

### EPIC-004: Task Creation Learning and Usefulness Feedback
- [x] Task fragments can be promoted from text selections
- [x] Task state (open/done) can be toggled
- [x] Promoted tasks show in inline task strip
- [x] Task origin cards link back to source note
- [x] CSS styling for task-related UI elements

### EPIC-005: Notes, Relationships, and Lifecycle Controls
- [x] Relationships have explicit/inferred distinction
- [x] Relationships have proposed/confirmed lifecycle states
- [x] Relationship inspector allows type editing
- [x] Directionality can be toggled for directional relationships
- [x] Constellation mode shows relationship graph
- [x] CSS styling for relationship inspector

### EPIC-007: AI-Assisted Editing and Transformations
- [x] AI transcript tracks content source (user-authored vs ai-generated)
- [x] Refinement presets available (clarify, summarize, etc.)
- [x] Preview before applying refinements
- [x] Replace or insert refinement options
- [x] CSS styling for refinement preview

---

## 7. Edge Cases and Notes

### Content Source Tracking
- User queries are marked as `'user-authored'`
- AI responses are marked as `'ai-generated'`
- Future: Inferred content will use `'ai-inferred'`
- Future: Content based on notes will use `'ai-sourced'`

### Task Fragments
- Stale fragment detection when source text changes
- Overlap checking to prevent duplicate promotions
- 4-item limit on suggested action fragments

### Relationship Lifecycle
- `proposed`: New inferred relationship awaiting user confirmation
- `confirmed`: User has confirmed the relationship
- `heuristicSupported`: Whether the inference heuristics still apply
- `stale`: When confirmed inferred relationship loses heuristic support

---

## 8. Testing Notes

To verify DG-3 features:

1. **Task Creation Flow**:
   - Select text in a note
   - Click "Promote to task"
   - Verify new task note is created with proper relationship

2. **Task State Toggle**:
   - Open a task note
   - Click task state button in danger menu
   - Verify visual state change in inline task strip

3. **Relationship Inspector**:
   - Open constellation mode on a note with relationships
   - Click a relationship row
   - Verify inspector shows with editing options

4. **AI Refinement**:
   - Open transform panel in note
   - Select text and choose refinement preset
   - Verify preview appears
   - Apply and verify content changes

---

## 9. Related Documentation

- `docs/relationship-slice.md` - Relationship system details
- `docs/relationship-visual-taxonomy.md` - Visual encoding rules
- `docs/AGENTS.md` - Agent implementation guidance
