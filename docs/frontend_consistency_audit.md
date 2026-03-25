# Frontend Consistency Audit (Atom Notes)

Date: 2026-03-25
Scope: frontend visual, interaction, and architecture consistency for note surfaces (shelf → open note), chip systems, mobile/desktop behavior, checklist flows, helper/panel rendering, and mode coherence.

## 1) Findings by inconsistency class

### A. Surface continuity drift (shelf card vs canvas card vs open modal)

**What is inconsistent**
- Shelf cards use a `tone` split (`paper` vs `panel`) and route focused notes to a mint paper gradient (`.shelf-item--paper`) while canvas note cards use a dark panel surface and open notes use a separate gradient shell. This breaks object continuity when opening a note from shelf to modal. 
- Open note shell styles are declared in multiple places, with later passes re-overriding widths, padding, radius, and shadows.

**Evidence**
- Shelf tone branching and `paper` assignment for focus notes. (`src/components/ShelfView.tsx`) 
- Canvas note card dark surface token usage. (`src/styles.css`) 
- Open note shell/modal has multiple competing declarations. (`src/styles.css`) 

**Root cause**
- Visual identity is being used to encode state/context in each surface independently, instead of one shared note-surface contract.
- CSS accretion: multiple theme/correction passes appended without deleting prior rules.

---

### B. Chip and pill styling divergence (contrast + semantics)

**What is inconsistent**
- Chips are implemented through unrelated class families (`relationship-strip`, brief action chips, focus chips, recall chips, mobile summary rows, generic buttons) with different contrast logic, borders, and hover states.
- Foreground/background contrast strategy varies between token-based and hardcoded RGBA values, causing unpredictable readability across backgrounds.

**Evidence**
- Relationship strip chip/button style uses muted text and translucent dark rules. (`src/components/RelationshipStrip.css`)
- Brief chips use accent-tinted fill + stronger border/foreground blending. (`src/components/brief/BriefActionChip.css`)
- Global `button` + `ghost-button` defaults and many ad-hoc chip variants override each other. (`src/styles.css`)

**Root cause**
- No single “chip contract” primitive with variant tokens (neutral/info/accent/danger + active/inactive).
- Component-local styling plus global fallback button styles create style leakage.

---

### C. Mobile vs desktop note-open behavior divergence

**What is inconsistent**
- On mobile note-open, backdrop and relationship web are disabled, while desktop behavior expects context dimming and local relationship context.
- App currently passes `suppressBackgroundContext` when rendering the note overlay scene, effectively suppressing background graph context regardless of platform.
- Mobile hides mode tabs after the second button (`nth-child(n + 3)`), so constellation/source become overflow-only interactions.

**Evidence**
- Backdrop/web are gated by `!mobileNoteMode && !suppressBackgroundContext`. (`src/components/NoteOpenOverlayScene.tsx`)
- App passes both `mobileNoteMode` and `suppressBackgroundContext`. (`src/App.tsx`)
- Mobile CSS hides tab buttons 3+. (`src/styles.css`)

**Root cause**
- Platform behavior forked in both React logic and CSS, without a shared progressive-disclosure pattern for mobile.

---

### D. Checklist rendering/editing architecture split

**What is inconsistent**
- Read mode checklist interactivity is markdown-line based (`lineIndex` toggles in raw source).
- Edit mode checklist is semantic-block based (`checklist_item` blocks with structured parsing/serialization and block-level behaviors).
- Two models are valid but not unified behind one checklist domain contract.

**Evidence**
- Read projection parses markdown lists and toggles checkboxes by line mutation. (`src/markdownProjection.ts`, `src/components/MarkdownProjectionView.tsx`)
- Edit mode uses semantic block parser/editor with checklist block type conversion and direct checkbox state edits. (`src/components/InlineNoteLinkEditor.tsx`)

**Root cause**
- Historical layering: markdown projection and semantic block editor evolved separately.
- Missing canonical “checklist operation” API shared by both read and edit surfaces.

---

### E. Duplicated/competing mobile note controls

**What is inconsistent**
- Header renders duplicate close affordances (dedicated mobile close + secondary close action + overflow close).
- Pin/reset actions appear both as direct buttons and overflow actions depending on viewport rules.

**Evidence**
- Multiple close/pin/reset controls in header tool cluster + overflow menu. (`src/components/ExpandedNote.tsx`)
- Mobile-only visibility rules toggle some actions while keeping others duplicated. (`src/styles.css`)

**Root cause**
- Feature addition by accretion rather than replacing prior controls with a single control map.

---

### F. Helper/panel conditional rendering inconsistency

**What is inconsistent**
- Helper visibility is controlled by both React state (`editAssistOpen`) and CSS context selectors (`focus-within` hides helper regions on mobile edit).
- Utility sections are conditionally hidden per mode and then hidden again by viewport/focus rules.

**Evidence**
- `editAssistOpen` controls helper sections in edit mode. (`src/components/ExpandedNote.tsx`)
- CSS suppresses helper sections in edit/focus contexts, especially on mobile. (`src/styles.css`)

**Root cause**
- Mixed responsibility: rendering policy split between component state logic and CSS behavior hacks.

---

### G. Token consistency drift (spacing/radius/border/shadow/elevation)

**What is inconsistent**
- Design tokens exist, but a large amount of hardcoded values and repeated overrides exist in the main stylesheet.
- Same selectors (`.expanded-note`, `.expanded-note-shell`, `.note-body-surface`) appear in many places with evolving dimensions and elevation values.

**Evidence**
- Tokens are defined centrally. (`src/styles/tokens.css`)
- Multiple `.expanded-note*` and correction-pass overrides with different radius/shadow/padding values. (`src/styles.css`)

**Root cause**
- Single giant stylesheet with historical passes retained; no enforced token-only linting or style ownership boundaries.

---

### H. Mode-switch coherence (read/edit/helpers/source/constellation)

**What is inconsistent**
- Mode state machine (`read | edit | constellation | source`) is coherent in TypeScript, but discoverability differs by viewport due to CSS tab hiding and overflow fallbacks.
- Helpers are subordinate to edit mode but further gated by additional toggles and layout states, creating nested mode complexity.

**Evidence**
- Panel mode enum and mode tab controls in component logic. (`src/components/ExpandedNote.tsx`)
- Mobile tab hiding and overflow-only mode access in CSS and header controls. (`src/styles.css`, `src/components/ExpandedNote.tsx`)

**Root cause**
- Cross-platform mode architecture not codified as one explicit interaction contract.

---

### I. One-off variants/exception logic that should be normalized

**Examples**
- `suppressBackgroundContext` used as broad behavior kill-switch during note open.
- Correction-pass section introduces late overrides instead of consolidating previous definitions.
- Global button/chip defaults and per-component exceptions intermingle.

**Root cause**
- Quick spot-fix strategy created escape hatches that became permanent behavior.

## 2) Proposed UI contract/system (normalization target)

## 2.1 Note surface contract
- **Surface levels**
  - `note-surface/card` (shelf + canvas card)
  - `note-surface/modal` (open note)
  - `note-surface/utility` (quiet secondary panels)
- **Continuity rule**
  - Same base hue family and border token from shelf card → canvas card → modal.
  - State changes (focus/active/history) should alter accent/ring/emphasis, not swap material family.
- **Elevation rule**
  - 3 fixed elevation steps only: `e1 card`, `e2 modal`, `e3 floating utility`.

## 2.2 Chip contract
- Single primitive: `Chip` with variants: `neutral | accent | status | warning | danger` and states `default | hover | active | disabled`.
- Define minimum contrast rule for chip text over background (tokenized foreground pair per variant).
- Ban ad-hoc chip classes unless mapped to `Chip` variants.

## 2.3 Note-open interaction contract (desktop + mobile)
- Always keep **object continuity**: opening a note should preserve context with at least dimmed background and a faint local relation hint.
- Mobile may simplify density, but must not remove relationship context entirely; degrade by cap/opacity, not hard disable.
- Single source of truth for available note modes; viewport can re-layout controls but cannot silently remove core modes.

## 2.4 Checklist contract
- Canonical checklist operation API:
  - `toggleChecklistItem(noteId, itemId | stableAnchor)`
  - `insertChecklistItem`, `convertBlockToChecklist`, `resolveChecklistState`
- Read and edit surfaces consume the same operation API; markdown line fallback should be internal compatibility, not top-level architecture.

## 2.5 Helper/panel contract
- Visibility policy owned by React state machine, not CSS `focus-within` suppression.
- CSS should style shown/hidden states, never decide business visibility.

## 3) Prioritized refactor plan (high impact / low risk first)

## P0 — Stabilize behavior contract (no broad rewrite)
1. **Create a `NoteOpenPolicy` object** that computes: backdrop visibility, relationship-web visibility, mode availability, helper availability by viewport + state.
2. **Remove unconditional `suppressBackgroundContext` usage** in app flow; replace with explicit context levels (`full`, `reduced`, `minimal`).
3. **Deduplicate mobile header actions** into a single action map and one close affordance.

## P1 — Visual normalization with minimal UI churn
4. Introduce `NoteSurface` token set (card/modal/utility) and remap shelf/canvas/modal surfaces to shared tokens.
5. Introduce shared `Chip` primitive and migrate high-traffic chips first (mode switch chips, relationship strip, summary chips).
6. Consolidate `.expanded-note` and `.expanded-note-shell` definitions into one source block + media overrides only.

## P2 — Checklist architecture alignment
7. Add checklist domain service (`ChecklistService`) with stable IDs/anchors; adapt projection toggles to service calls.
8. Keep semantic block editor as authoring source; make markdown projection a pure read renderer over canonical checklist state.

## P3 — Drift prevention
9. Split giant stylesheet by domain (`note-surface.css`, `chip.css`, `mobile-note.css`, etc.) and document ownership.
10. Add lint/CI checks for token usage and duplicate selector definitions in core note files.

## 4) Banned moves / anti-patterns (to prevent further drift)

1. **No new global button/chip overrides** in `styles.css` for note-specific behavior.
2. **No viewport-only feature removal** (e.g., hiding essential note modes/actions without alternative parity).
3. **No kill-switch props** that broadly disable context (`suppressBackgroundContext`) without a typed policy reason.
4. **No duplicate controls** for the same action in one viewport/state.
5. **No CSS-driven business logic** (`focus-within` used to change helper product behavior).
6. **No new one-off surface gradients** for note states; use tokenized surface + accent overlays.
7. **No checklist mutation directly by fragile line index** outside compatibility adapter.
8. **No correction-pass append-only patches**; replace/merge old rules and delete superseded selectors.

## 5) Implementation guidance

- Do not broad-rewrite `ExpandedNote`; normalize around policy + primitives.
- Prioritize mobile clarity: one primary mode row, one overflow menu, one close action, content-first body area.
- Preserve calmness: reduce visual variants; encode meaning with minimal channels.
- Keep relationship context subtle and present on note open across platforms.
