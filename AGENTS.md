# AGENTS.md

Project: Atomic Notes — Modal Relationship System

## Purpose

This project implements a note-taking environment where:

- the visible interface is minimal, calm, and tactile
- the underlying system is structured, relational, and time-aware

Agents working in this repository must preserve that balance at all times.

---

## 🧭 Core Philosophy

### Soft surface, hard spine

- The UI should feel simple, quiet, and forgiving
- The system underneath must be strict, structured, and reliable

### Calm at rest, deep on demand

- Default state: minimal, no visual noise
- Interaction: reveals structure progressively

### Structure is real, but mostly invisible

- Do not surface all metadata at once
- Do not require users to manually organize everything
- Let the system infer, structure, and reveal only when needed

---

## 🎯 Feature Scope

### Note Modal with Relationship Web

When a user opens a note:

- A modal appears with the note content
- The background dims
- A faint relationship web appears behind the modal
- The web shows only the local context of the selected note

This is not a graph viewer.  
This is contextual structure revealed on demand.

---

## 🧠 System Architecture

### Core Entities

```text
Note {
    id
    content
    note_type
    workspace_id
    project_ids
    created_at
    updated_at
    last_viewed_at
    status
    archived
    position
}

Relationship {
    id
    source_id
    target_id
    type
    explicit
    confidence
    created_at
    last_active_at
    archived
    explanation
}
```

### Core Components

- NoteModal
- RelationshipGraph
- GraphRenderer
- GraphDataService
- TimeScoringEngine
- GraphInteractionController

### Separation of concerns

- UI components must not contain ranking logic
- Time scoring must not live in rendering code
- Relationship explanation must not be hardcoded in UI

Maintain clear boundaries between:

- data
- logic
- rendering
- interaction

---

## 🌐 Relationship Graph Rules

### Visibility constraints

- Show only first-degree relationships prominently
- Show second-degree relationships faintly
- Hard cap:
  - ~12 strong nodes
  - ~20 total nodes

### Relationship budget

Each note has a maximum number of strongly visible relationships.

If new relationships are added beyond this limit:

- lower-priority relationships must decay in visibility
- or collapse into groups

The system must preserve clarity over completeness.

Never render the full graph.

### Ranking priorities

When selecting visible nodes, prioritize:

1. explicit > inferred
2. active tasks > passive references
3. same project > cross-project
4. recent > stale
5. high confidence > low confidence

### Edge semantics

Color (relationship type)

- green → task / dependency
- purple → reference / source
- blue → conceptual
- amber → parent-child / derived
- red → conflict
- gray → inferred / weak

Style

- solid → explicit
- dashed → inferred
- dotted → historical

### Node semantics

- workspace → subtle halo
- project → badge or cluster
- type → icon
- archived → dim + softened

Do not encode multiple meanings in the same visual channel.

---

## ⏱️ Time-Aware Behavior

### Principle

Time determines relevance, not visibility alone.

The graph must distinguish:

- active structure (what matters now)
- historical structure (what mattered before)

### Inputs for time scoring

- last viewed
- last edited
- last linked
- task state (open/closed)
- downstream activity
- relationship reinforcement

### Effects of time

- Recent → higher opacity, higher priority
- Stale → reduced opacity
- Historical → dotted edges, background presence

### Modes

- Default → present-biased
- History mode → increases visibility of older relationships

Do not animate time continuously. Update only on meaningful events.

---

## 🎨 Visual System Rules

### Graph appearance

- Must remain faint
- Must not compete with modal
- Must not feel like a full graph tool
- Must be readable at a glance

### Animation rules

Sequence:

1. modal opens
2. background dims
3. unrelated nodes fade
4. first-degree edges appear
5. second-degree edges appear faintly

Constraints:

- no abrupt snapping (except modal)
- no jittery physics
- no excessive motion

### Layout rules

- Preserve canvas spatial memory
- Apply only minor positional adjustments
- Avoid full re-layout on modal open

---

## 🖱️ Interaction Model

### Relationship strip

Inside modal:

- Sources
- Tasks
- Related
- History
- Conflicts

Behavior:

On hover:

- highlight matching edges
- dim others
- raise relevant nodes

### Node interaction

- Clicking a background node replaces the modal
- Graph re-centers on the new node

### Edge interaction

- Hover shows explanation
- Must explain inferred relationships

Examples:

- "Shared entity"
- "Same source document"
- "Semantic similarity"

---

## ⚡ Performance Constraints

### Requirements

- First-degree graph render < 100ms
- Full reveal < 400ms
- Maintain ~60fps

### Optimization strategies

- cache neighbors
- precompute rankings
- lazy-load second-degree nodes
- cap node count aggressively
- debounce hover events

If performance degrades

DO THIS FIRST:

- reduce node count
- reduce edge count

DO NOT:

- add more computation
- increase visual density

---

## 🚫 Anti-Goals

Agents must NOT:

- render full graph universes
- create always-on graph overlays
- overload UI with metadata
- mix multiple meanings into one visual encoding
- present inferred relationships as facts
- create flashy or decorative graph effects
- use heavy physics simulations during modal open

Avoid:

- “conspiracy board” visuals
- “dashboard overload”
- “AI magic with no explanation”

---

## ✅ Definition of Done

The feature is complete when:

- Opening a note feels immediate and focused
- The relationship web appears subtle but informative
- Users can understand connections without effort
- Traversal between notes feels natural
- Active vs historical relationships are distinguishable
- The UI remains calm under all conditions

---

## 🧪 Heuristic Test

If a user says:

> “I didn’t notice it at first, but now I can see how everything connects”

→ success

If a user says:

> “This looks cool but I don’t understand it”

→ failure

---

## 🧠 Agent Operating Rules

When making implementation decisions:

Prefer:

- clarity over completeness
- subtlety over spectacle
- trust over cleverness
- responsiveness over density

Always ask:

- Does this make the system easier to understand?
- Does this preserve calmness?
- Does this expose truth without overwhelming the user?

---

## 🧭 Final Principle

Build a system that:

- absorbs messy thoughts
- structures them quietly
- reveals meaning when needed

The interface should feel like paper.  
The system should think like a graph.  
Time should decide what matters.

---

## Codex system prompt: note modal relationship web

You are implementing a note-canvas feature in an app with a calm, minimal visual style and a strong hidden structural model.

Your job is to build a note inspection modal that reveals a faint relationship web behind the modal when a note is opened. The experience must feel precise, quiet, and intuitive. Do not overcomplicate the visible UI. Hidden infrastructure should be rigorous; visible presentation should remain calm.

### Product doctrine

The interface should feel soft and simple.  
The underlying model should be strict and graph-aware.  
Structure should be mostly invisible until it becomes useful.

Design toward:

- calm at rest
- deep on demand
- soft surface, hard spine

Do not build a noisy graph explorer. Do not turn the modal into a dashboard. Do not render all metadata at once. The graph is contextual, not permanent.

---

### Primary feature goal

When a user selects a note:

- open a modal showing that note
- dim the canvas behind it
- reveal a faint web of related notes and edges behind the modal
- prioritize first-degree connections
- show second-degree connections only as faint context
- allow lightweight filtering and traversal
- make relationship relevance sensitive to time and activity

The user should feel that opening a note reveals its local reality, not that they have switched into a separate graph tool.

---

### UX requirements

#### Modal behavior

- The modal must be the visual foreground.
- The selected note becomes the inspection subject.
- The background relationship web must support understanding without competing for attention.
- The default modal content should remain clean and readable.

#### Graph behavior

- Show only the local network around the selected note.
- Strongly cap graph density.
- Prefer ranked relevance over completeness.
- Preserve canvas spatial memory where possible rather than fully re-laying out the graph.
- Avoid full physics simulation during modal open.

#### Filtering behavior

Inside the modal, provide a compact relationship strip with categories such as:

- Sources
- Tasks
- Related
- History
- Conflicts

Hovering or selecting one of these categories should:

- brighten matching edges
- dim non-matching edges
- raise visibility of relevant connected nodes

#### Traversal behavior

- Clicking a visible background related note should replace the modal contents with that note and redraw the local graph.
- Traversal should feel smooth and coherent.

#### Trust behavior

- Explicit and inferred relationships must be visually distinct.
- Inferred relationships must be explainable.
- Historical links must not appear equally active as current links.
- The system must never imply certainty where there is only inference.

---

### Visual rules

#### The graph must stay faint

The relationship web should be:

- low contrast
- low opacity
- restrained in motion
- readable at a glance
- inspectable on demand

No neon graph styling. No decorative over-animation. No always-on spaghetti.

#### Edge color semantics

Use edge color for relationship type only:

- green = task, dependency, actionable
- purple = source, reference, citation
- blue = conceptual relation, related idea
- amber = parent-child, derived-from, promoted-into
- red = conflict, blocked, superseded
- gray = weak or inferred background relationship

Do not use edge color for workspace or project.

#### Edge line styles

Use line style to encode certainty or temporal state:

- solid = explicit user-created relationship
- dashed = inferred or AI-suggested relationship
- dotted = historical or archived relationship

#### Node semantics

Use node treatment rather than edge color for other dimensions:

- workspace = subtle halo or accent
- project = badge or clustering cue
- note type = icon or glyph
- archived = reduced opacity and softened rendering

---

### Time-aware graph rules

The relationship web must reflect what is active now versus what is mostly historical.

Time awareness should affect:

- ranking
- opacity
- visibility priority
- historical mode behavior

Recent and active items should be more visually present.  
Older but still meaningful items should remain available but softer.  
Historical chains should become clearer when the user inspects history.

Use inputs like:

- last viewed
- last edited
- last linked
- last referenced
- task open/closed state
- descendant activity
- relationship reinforcement recency

Do not create constant visual motion to represent time. Time-aware updates should happen on meaningful UI or data events, not as perpetual animation.

Support:

- default present-biased mode
- history mode with stronger visibility for older lineage

---

### Rendering rules

#### Node limits

Use hard caps.

- Show approximately 8 to 12 strong first-degree related notes.
- Show at most about 20 total visible nodes including faint context.
- Hide, collapse, or omit the rest.

#### Ranking priorities

Prioritize:

- explicit over inferred
- active tasks over passive references
- same project over distant context
- recent over stale
- high-confidence over weak-confidence

#### Layout behavior

- Preserve approximate canvas positions where possible.
- Apply only slight positional adjustment for readability.
- Do not do a dramatic re-layout during modal open.
- Save full constellation or graph re-layout for a dedicated future view.

#### Animation behavior

The graph reveal should feel staged and quiet:

- modal opens first
- unrelated notes dim
- first-degree graph fades in
- second-degree context fades in faintly afterward

Nothing except the modal should snap harshly into place.

---

### Performance rules

This feature must feel smooth. If performance degrades, reduce graph density and rendering work before adding complexity.

Prefer:

- precomputed first-degree bundles
- cached ranked neighbors
- lazy-loaded second-degree context
- stable layout hints
- debounced hover reactions
- limited animation scope

Avoid:

- expensive live force simulations on every open
- unbounded node rendering
- unnecessary re-renders on hover
- large dynamic graph recomputation in the hot path

---

### Data model expectations

Assume the system has or should have entities like:

- Note
- Relationship
- Workspace
- Project
- Provenance metadata
- Activity or temporal metadata

Each relationship should support:

- type
- explicit vs inferred
- confidence
- timestamps
- historical status
- explanation metadata

Each note should support:

- identity
- content
- type
- workspace
- projects
- timestamps
- status
- archived state
- canvas position

Do not flatten everything into purely visual state. Keep the hidden model rigorous.

---

### Implementation priorities

Build in this order:

1. modal open and background dimming
2. first-degree relationship rendering behind modal
3. edge color and line style semantics
4. relationship strip filtering behavior
5. click-through traversal between notes
6. time-aware ranking and opacity
7. history mode behavior
8. inferred-link explanation tooltips or micro-panels
9. refinement and performance tuning

Do not jump to polish before the interaction model and ranking logic are sound.

---

### Code quality expectations

Write code that is:

- modular
- testable
- readable
- typed where appropriate
- structured around clear responsibilities

Prefer components and services with explicit purpose, such as:

- NoteModal
- RelationshipGraph
- GraphDataService
- TimeScoringEngine
- GraphInteractionController

Do not bury business logic in rendering code.  
Do not bury temporal ranking in UI components.  
Do not hide relationship explanation logic inside styling code.

---

### Decision rules when tradeoffs appear

If forced to choose:

- choose clarity over completeness
- choose responsiveness over density
- choose trustworthiness over cleverness
- choose subtlety over spectacle
- choose progressive disclosure over visible complexity

If the result looks impressive but confusing, simplify it.  
If the result is accurate but visually loud, quiet it down.  
If the result is elegant but hides important truth, expose just enough explanation.

---

### Anti-goals

Do not build:

- a permanent always-on graph overlay
- a dense node-link diagram covering the canvas
- a modal stuffed with badges, chips, and metadata clutter
- unexplained inferred relationships
- time behavior that looks like a flashy heat map by default
- full graph simulation on note open
- visual encodings where one channel carries too many meanings

Avoid conspiracy-board aesthetics. Avoid dashboard disease. Avoid fake intelligence theater.

---

### Definition of success

A successful implementation produces this feeling:

The user opens a note and immediately senses:

- what it connects to
- what kind of thing it is connected to
- what is active now
- what is historical residue
- where they might go next

The user should feel guided, not overwhelmed.

A failed implementation produces this feeling:

This looks cool, but I do not know what I am seeing.

---

### Final operating principle

Build a thinking environment, not a graph demo.

The visible experience should stay humane and quiet.  
The hidden system should be structured, explainable, and robust.  
The modal should reveal a note’s local universe with restraint.

---

## Codex pinned instruction

Implement a calm note modal that reveals a faint, time-aware local relationship web behind it. Keep the modal dominant, the graph subtle, and the hidden model rigorous. Show ranked first-degree relationships, faint second-degree context, explain inferred links, distinguish active versus historical connections, preserve spatial memory, and cap density hard. Favor clarity, trust, and responsiveness over visual complexity.

---

## PR Contract

Every PR that touches:

- modal behavior
- graph rendering
- relationship logic
- time-aware scoring
- visual encoding

MUST include:

### 1. What changed

(brief description)

### 2. Why it improves clarity

(explain how this makes relationships easier to understand)

### 3. Calmness check

Does this increase visual noise? If yes, justify.

### 4. Density impact

Does this increase nodes/edges rendered? If yes, explain mitigation.

### 5. Trust check

Are any inferred relationships affected? If yes, how is explainability preserved?

### 6. Before / After (required)

(screenshot or short clip)

---

## Known Failure Modes

Avoid these patterns:

1. Graph Inflation  
   Too many nodes/edges rendered → visual noise increases → meaning decreases

2. Semantic Overloading  
   Color or style encodes multiple meanings → user must decode → cognitive load spikes

3. Hidden Magic  
   System creates links without explanation → trust erodes

4. Modal Creep  
   Modal accumulates controls, badges, metadata → becomes a dashboard

5. Time Noise  
   Recency is shown through constant animation or color shifts → distraction

6. Layout Thrashing  
   Graph repositions aggressively → user loses spatial memory

---

## Core Invariant

At any moment, the user must be able to:

- understand what this note connects to
- understand what kind of connection each is
- distinguish what is active vs historical
- do this without reading instructions

If any change makes this harder, it must be rejected.

---

## Explainability Requirement

Any inferred relationship shown in the UI must be explainable in one sentence.

If it cannot be explained simply, it must not be shown.

---

## Relationship Lifecycle

### Principle

Relationships are not static. They evolve based on use, time, and context.
The system MUST treat relationships as living signals, not permanent edges.

### Required properties

Every relationship MUST have:

- relationship_type
- lifecycle_state
- explicitness (`explicit` | `inferred` | `workflow_derived`)
- confidence_score
- reinforcement_score
- last_active_at
- created_at

Optional but recommended:

- explanation
- explanation_kind
- superseded_by
- rejected_reason

### Lifecycle states

Allowed states:

- proposed
- confirmed
- active
- cooling
- historical
- superseded
- rejected

### State rules

- Inferred relationships MUST begin as `proposed`.
- User-created relationships MUST begin as `confirmed` or `active`.
- Workflow-derived relationships MAY begin as `confirmed`.
- No inferred relationship may begin as `confirmed`.

### Visibility rules

Default modal view MUST prioritize:

- active
- confirmed (if relevant)
- minimal cooling

Default modal view MUST suppress:

- historical (unless explicitly requested)
- superseded
- rejected

### Reinforcement rules

A relationship MUST gain strength when:

- user traverses it
- notes are repeatedly viewed together
- one note is edited shortly after the other
- a user confirms the relationship
- a task depends on it
- it is referenced in downstream artifacts

Reinforcement MUST increase:

- ranking priority
- likelihood of becoming active

### Decay rules

A relationship MUST lose prominence when:

- no recent activity
- no recent traversal
- no active task dependency
- no reinforcement signals

Decay MUST affect:

- opacity
- ranking
- default visibility

Decay MUST NOT:

- delete provenance
- remove lineage relationships prematurely

### Durability rules

Not all relationships decay equally:

- `derived_from` → highly durable
- `references` → durable
- `task_dependency` → highly dynamic
- `related_concept` → fast decay
- `conflicts_with` → persistent until resolved

### Supersession rules

When a relationship or note is superseded:

- it MUST transition to `superseded`
- it MUST NOT compete with active structures
- it MUST remain visible in history mode

### Rejection rules

When a relationship is rejected:

- it MUST transition to `rejected`
- it MUST NOT appear in normal UI
- it MAY be stored internally to prevent re-suggestion

### Explainability requirement

Any inferred relationship shown MUST:

- have a one-sentence explanation
- expose its reasoning on hover or inspection

If it cannot be explained simply, it MUST NOT be shown.

### Core invariant (lifecycle)

At any time, the user must be able to:

- understand what connects
- understand why it connects
- distinguish active vs historical

No lifecycle behavior may violate this.

---

## Relationship Ontology Spec

This defines what relationship types are allowed to exist. Keep this constrained and do not expand casually.

### Structural

- `parent_child`: one note decomposes into another; durable; usually confirmed; rarely decays fully.
- `derived_from`: origin/provenance relationship; highly durable; preserved even when historical.
- `supersedes`: replaces older note/relationship; forces demotion of prior structure.

### Operational

- `task_dependency`: one task depends on another; highly dynamic; tied to active state.
- `action_source`: task originated from a note/reference; medium durability; traceability-focused.
- `belongs_to_project`: contextual grouping; often used for ranking/clustering instead of edge rendering.

### Knowledge

- `references`: source document/artifact linkage; durable and explainable.
- `related_concept`: semantic/topical overlap; starts proposed; must earn confirmation; decays quickly if unused.
- `same_entity`: shared entity linkage; medium durability; must remain explainable.

### Risk / Integrity

- `conflicts_with`: contradiction/inconsistency; high importance while unresolved.
- `duplicate_of`: near-duplicate content; should collapse representation around a dominant branch.

---

## Relationship State Machine

This state machine MUST be implemented exactly.

### Allowed transitions

| From | To | Condition |
|---|---|---|
| proposed | confirmed | user confirms OR strong reinforcement |
| proposed | rejected | user rejects OR low confidence persists |
| proposed | cooling | no reinforcement over time |
| confirmed | active | recent activity OR task dependency |
| confirmed | cooling | inactivity |
| active | cooling | activity drops |
| cooling | active | renewed activity |
| cooling | historical | prolonged inactivity |
| confirmed | historical | long-term inactivity |
| active | historical | no longer operationally relevant |
| active | superseded | replaced by newer relationship |
| confirmed | superseded | replaced by newer relationship |
| historical | active | revived by new activity |
| historical | superseded | replaced by newer lineage |

### Terminal state

- `rejected` is terminal for UI visibility, though it may still exist internally.

### Transition rules

- No direct `proposed` → `active`.
- No direct `rejected` → `active`.
- No state skipping without explicit justification.

---

## Lifecycle Implementation Logic

### Activity scoring (reference model)

```python
score = (
    base_weight(type)
    * confidence_score
    * reinforcement_score
    * recency_decay(last_active_at)
    * operational_relevance
    * provenance_weight
)
```

### Lifecycle update loop

Run on:

- modal open
- note edit
- traversal
- task update
- periodic background job

```python
def update_lifecycle(rel):
    if rel.explicit:
        promote_to_confirmed_if_needed(rel)

    if rel.reinforcement_score > threshold:
        rel.state = "active"
    elif is_stale(rel):
        if rel.state == "active":
            rel.state = "cooling"
        elif rel.state == "cooling":
            rel.state = "historical"
```

### Agent implementation rules

Agents must:

- NEVER invent new relationship types without updating ontology.
- NEVER bypass lifecycle state rules.
- NEVER render relationships without lifecycle awareness.
- NEVER promote inferred relationships directly to confirmed without required transition conditions.
- ALWAYS maintain explainability.

### Final doctrine

Relationships must:

- earn visibility
- reflect current reality
- preserve historical truth
- decay gracefully

The system is not a database of connections. It is a memory system with judgment.
The system should feel prescient, not presumptuous.

---

## Intent-Aware Surfacing

### Principle

The system MAY predict what the user is likely to need next, but prediction MUST only affect surfacing and ranking.

Prediction MUST NOT:

- create relationships by itself
- override lifecycle rules
- present low-confidence guesses as facts
- hide critical active relationships that should remain visible

Prediction is an assistive layer, not a truth layer.

### Intent signals

The system MAY estimate likely user intent from:

- current note content
- recent traversal path
- recent edits
- active workspace/project
- open tasks
- time/day usage patterns
- recurring workflow sequences
- active entities
- recently opened sources/attachments
- modal relationship filter usage
- search/query terms
- pending reviewer states
- notes frequently accessed together

Signals MUST be treated as probabilistic, not definitive.

### Allowed uses

Intent prediction MAY:

- reorder visible related notes
- boost likely-useful edges in default modal view
- suggest likely next notes
- elevate likely needed references
- prioritize active task chains
- prefetch likely next graph neighborhoods
- bias time-aware ranking toward likely current needs

Intent prediction MUST NOT:

- auto-confirm inferred relationships
- silently mutate provenance
- permanently alter lifecycle state
- suppress critical conflicting/active context without user action

### Confidence rules

Intent predictions MUST include confidence levels.

Low-confidence predictions:

- should remain subtle
- should not dominate ranking
- should not displace explicit high-value active relationships

High-confidence predictions:

- may modestly boost ordering
- may be prefetched
- may be surfaced as likely-next candidates

If confidence is weak, the system MUST fall back to lifecycle + recency.

### Explainability rules

Visible prediction-based surfacing SHOULD be one-sentence explainable, e.g.:

- "Often opened next in this workflow"
- "Referenced by your open task chain"
- "Recently edited in the same session"
- "Common next source for this note type"

If the system cannot explain an elevation, it should not elevate strongly.

### UI rules

Intent-aware behavior must remain quiet.

Prefer:

- slight ranking boosts
- subtle likely-next strip
- pre-highlighted nearby nodes
- silent prefetch

Avoid loud "AI suggests" clutter.

### Safety rules

Prediction MUST preserve trust by avoiding:

- overconfident surfacing of weak semantic links
- repeatedly surfacing rejected/ignored suggestions
- filter bubbles that hide conflicting information
- replacing explicit user intent with guessed intent

When explicit actions conflict with prediction, explicit user intent wins.

---

## Intent Ontology Spec

### Intent classes

- `reference_lookup`
- `task_execution`
- `concept_exploration`
- `history_trace`
- `conflict_resolution`
- `review_commit`

### Class-specific boosts

- `reference_lookup` boosts: `references`, `action_source`, `derived_from`
- `task_execution` boosts: `task_dependency`, `action_source`, unresolved `conflicts_with`
- `concept_exploration` boosts: `related_concept`, `same_entity`, secondary `references`
- `history_trace` boosts: `derived_from`, `supersedes`, historical edges, `references`
- `conflict_resolution` boosts: `conflicts_with`, `duplicate_of`, `supersedes`, relevant `references`
- `review_commit` boosts: `action_source`, `derived_from`, `task_dependency`, `conflicts_with`

### Intent scoring model

```text
surface_score =
    relationship_strength
    × intent_match
    × context_relevance
    × user_pattern_affinity
    × safety_guard
```

Where:

- `relationship_strength`: lifecycle-derived strength
- `intent_match`: fit to inferred intent class
- `context_relevance`: workspace/project/entity/session relevance
- `user_pattern_affinity`: habitual navigation affinity
- `safety_guard`: penalty/guardrail against overpromotion

### Intent score inputs

For candidate relationships compute:

- lifecycle_weight
- type_match_weight
- session_path_weight
- workspace_match_weight
- project_match_weight
- task_pressure_weight
- entity_focus_weight
- recency_weight
- habit_weight
- rejection_penalty
- conflict_preservation_boost

---

## Intent Context State Rules

Intent is a session/context overlay, not a permanent relationship state.

Use ephemeral object:

```text
IntentContext
- intent_class
- confidence
- inferred_from_signals
- started_at
- updated_at
- expires_at
```

Rules:

- IntentContext must expire.
- IntentContext must be recomputed on meaningful actions.
- IntentContext must not permanently modify lifecycle.
- Multiple intents may coexist, but one primary intent should drive ranking at a time.

### Recompute triggers

Recompute on:

- modal open
- note traversal
- filter hover/select
- search query
- task status change
- workspace switch
- reviewer action
- attachment/source open

Do not recompute on every micro-movement.

---

## Intent Prediction Rules

- Intent prediction is ephemeral and session-scoped.
- It may reorder surfacing, but not alter truth.
- It must never auto-confirm inferred relationships.
- It must never hide critical active/conflicting context.
- It must degrade gracefully to lifecycle-only ranking when confidence is low.
- It should become quieter, not louder, as uncertainty rises.
- Rejected suggestions should incur future surfacing penalty.
- Repeatedly useful paths may gain ranking priority, but not bypass explanation or lifecycle rules.

### UX examples

- Task mode: mildly boost task edges and operational references; keep unresolved conflicts visible.
- History mode: boost lineage/provenance edges and historical legibility.
- Concept mode: raise conceptual/entity context without erasing operational relevance.

### Guardrails against creepy behavior

Never:

- anthropomorphize predictions as authority
- make unstable guesses dominant
- repeatedly resurface ignored suggestions without decay
- trap users in behavior loops
- hide contradictions purely due to behavioral ranking

### Doctrine lines

- Prediction may guide attention, but it must never rewrite truth.
- The system should anticipate the next useful step, not presume authority over user intent.

---

## Practical Build Objects

- `IntentSignalCollector`
- `IntentContextService`
- `IntentScoringEngine`
- `SurfaceRankingEngine`

Responsibilities:

- `IntentSignalCollector`: gather filters, traversals, tasks, workspace/project context, source opens, queries.
- `IntentContextService`: infer primary intent class + confidence.
- `IntentScoringEngine`: score relationship candidates against intent.
- `SurfaceRankingEngine`: combine lifecycle strength + intent + safety into final ranking.

### Reference pseudocode

```python
def rank_visible_relationships(note_id, intent_context):
    rels = get_candidate_relationships(note_id)
    ranked = []

    for rel in rels:
        strength = compute_relationship_strength(rel)
        intent_match = compute_intent_match(rel, intent_context)
        context_score = compute_context_relevance(rel, note_id)
        safety = compute_safety_guard(rel)

        final_score = strength * intent_match * context_score * safety
        ranked.append((rel, final_score))

    return sort_desc(ranked)


def infer_intent_context(session):
    scores = {
        "reference_lookup": score_reference_lookup(session),
        "task_execution": score_task_execution(session),
        "concept_exploration": score_concept_exploration(session),
        "history_trace": score_history_trace(session),
        "conflict_resolution": score_conflict_resolution(session),
        "review_commit": score_review_commit(session),
    }

    intent = max(scores, key=scores.get)
    confidence = normalize(scores[intent])

    return IntentContext(intent_class=intent, confidence=confidence)
```

## Intent-Aware Ranking

The system MAY infer likely current user intent from session behavior and context.

This inference:

- MUST be ephemeral
- MUST be explainable
- MUST affect ranking only
- MUST NOT alter truth, provenance, or lifecycle state

Intent-aware ranking SHOULD:

- surface likely-useful next notes
- preserve conflicts and important active context
- degrade gracefully under uncertainty
- remain visually subtle

Under low confidence, the system MUST fall back to lifecycle-based ranking.

---

## Attention Budget and Surfacing Quotas

### Principle

User attention is finite.

The system MUST treat visible structure as a scarce resource.
The goal is not to show everything relevant.
The goal is to show the smallest useful set that supports the next step in thought or action.

Visibility MUST be earned through:

- lifecycle strength
- intent match
- contextual relevance
- trustworthiness
- cognitive cost

The system must prefer clarity over completeness at all times.

### Core rules

- Every modal view MUST operate within a fixed attention budget.
- Every visible note, edge, badge, indicator, and callout consumes part of that budget.
- If new items are surfaced, lower-priority items MUST fade, collapse, or defer.
- The system MUST never expand visible structure without bound.
- Intent-aware surfacing MUST stay within the same budget; prediction does not create extra display allowance.

### Budget categories

The modal relationship system SHOULD manage separate but coordinated budgets for:

- visible connected notes
- visible edges
- relationship categories emphasized at once
- metadata indicators
- proactive suggestions
- motion/animation emphasis

These budgets MUST be capped independently and together.

### Default budget guidance

Recommended default caps for standard modal view:

- strong connected notes: 6 to 8
- faint contextual notes: up to 12
- strong visible edges: 6 to 10
- faint visible edges: up to 12
- emphasized relationship categories at once: 1 primary, 1 secondary maximum
- proactive suggestions: 0 to 2
- animated emphasis effects: 1 active emphasis pattern at a time

These are the default design contract. Any deviation must be explicitly justified.

### Priority rules

When the budget is full, visible items MUST be chosen by ranked utility, not raw existence.

Priority order should consider:

1. active and explicit relationships
2. unresolved conflicts
3. open task dependencies
4. directly supporting references
5. durable lineage relevant to current intent
6. confirmed but cooling relationships
7. inferred conceptual neighbors
8. historical-only context

If a lower-priority item enters view, a higher cognitive-cost item of lower utility should leave first.

### Cognitive cost rules

Not all visible elements cost the same.

Higher-cost items include:

- crossing edges
- multiple simultaneous colors
- animated emphasis
- inferred links
- conflicting indicators
- deeply historical context
- more than one explanatory callout at once

Lower-cost items include:

- stable nearby nodes
- one dominant relationship color family
- compact counts
- on-demand explanations
- subtle opacity changes
- grouped/collapsed context

Ranking must account for both usefulness and visual/cognitive cost.

### Surfacing quotas

The system MUST enforce quotas for special classes of surfaced information.

Prediction quota:

- no more than 2 prediction-driven surfaced elements elevated at once in standard modal view
- under low confidence, prediction quota should fall to 0 or 1

Conflict quota:

- critical conflicts may bypass some suppression, but should still respect visual calm
- no more than 2 unresolved conflict links should be strongly emphasized by default

Explanation quota:

- no more than 1 expanded explanation tooltip/panel should be visible at once
- explanation should be progressive, not broadcast

Historical quota:

- historical relationships should remain mostly suppressed in default mode
- default modal view should show at most 2 strongly legible historical relationships unless History mode is active

### Escalation rules

If visible budget cannot accommodate all high-priority context, the system MUST escalate with:

- counts
- grouped clusters
- expandable summaries
- "show more" affordances
- category filters

It MUST NOT solve overflow by simply drawing more things.

### Preservation rules

Budgeting MUST preserve:

- at least one actionable path when relevant
- at least one source/reference path when relevant
- critical conflict visibility
- ability to distinguish active vs historical

Budgeting must never erase essential truth.

### Fallback rule

If ranking confidence is weak or competing priorities are too close:

- reduce visible complexity
- prefer stable explicit relationships
- suppress low-confidence inferred context
- fall back to lifecycle-based minimal display

When uncertain, become quieter.

---

## Attention Ontology

### Attention units

Every visible element should have an approximate attention cost. It does not need to be philosophically perfect; it must be consistent enough to guide ranking.

Suggested element costs:

Nodes

- primary connected note: 1.0
- faint contextual note: 0.5
- archived/historical faint note: 0.4
- predicted likely-next note: 1.2

Edges

- explicit active edge: 0.8
- faint contextual edge: 0.3
- inferred edge: 1.0
- conflict edge: 1.1
- animated/pulsing edge: 1.4

UI emphasis

- category highlight: 0.8
- badge/indicator: 0.3
- visible explanation tooltip: 1.2
- proactive suggestion chip: 1.0
- secondary callout/overlay: 1.4

### Global budget model

Treat each modal state as having a maximum budget, e.g.:

```text
standard_modal_attention_budget = 12.0
history_modal_attention_budget = 14.0
task_execution_attention_budget = 13.0
concept_exploration_attention_budget = 12.5
```

Different modes may vary slightly, but default mode should remain the strictest.

### Surface selection model

Rank by value density, not utility alone:

```text
surface_value = utility_score / attention_cost
```

Where:

```text
utility_score =
    relationship_strength
    × intent_match
    × context_relevance
    × trustworthiness
    × preservation_boost
```

And:

```text
attention_cost =
    visual_cost
    + semantic_cost
    + motion_cost
    + ambiguity_penalty
```

A relationship can be relevant but still not worth showing if cognitive cost is too high for marginal utility.

### Quota system by context

Quotas may adapt by intent but must remain bounded.

`task_execution`

- bias: open task edges, blocking conflicts, source references
- guidance: proactive suggestions up to 2; conceptual links strongly limited; lineage minimal unless required

`reference_lookup`

- bias: references, derived-from lineage, action_source
- guidance: source paths up, predictions modest, conflicts only if directly relevant

`concept_exploration`

- bias: related_concept, same_entity, nearby references
- guidance: allow more conceptual links only within total budget; reduce tasks unless critical

`history_trace`

- bias: supersedes, derived_from, historical references
- guidance: historical quota can increase; proactive suggestions decrease

`conflict_resolution`

- bias: conflicts_with, duplicate_of, supersedes, key references
- guidance: conflicts may consume more budget share; conceptual links aggressively reduced

---

## Attention Budget Context

Use ephemeral view/session object:

```text
AttentionBudgetContext
- total_budget
- remaining_budget
- node_budget
- edge_budget
- explanation_budget
- prediction_budget
- historical_budget
- mode
- primary_intent
- updated_at
```

This is session/view state, not persistent truth.

### Selection algorithm

1. Build candidate set from lifecycle + intent + context.
2. Assign each candidate utility score, attention cost, and quota class.
3. Sort by value density with preservation rules.
4. Add candidates while total budget remains, quota limits hold, and essential truth remains intact.
5. Collapse remainder into counts, grouped clusters, or hidden-on-demand categories.

Reference pseudocode:

```python
def select_visible_items(candidates, attention_context):
    selected = []
    remaining = attention_context.total_budget

    ranked = sorted(
        candidates,
        key=lambda c: c.utility_score / max(c.attention_cost, 0.1),
        reverse=True,
    )

    for candidate in ranked:
        if violates_quota(candidate, attention_context, selected):
            continue
        if candidate.attention_cost > remaining:
            continue
        if would_hide_essential_truth(candidate, selected):
            continue

        selected.append(candidate)
        remaining -= candidate.attention_cost

    return enforce_preservation_rules(selected, candidates, attention_context)


def enforce_preservation_rules(selected, candidates, ctx):
    selected = ensure_actionable_path(selected, candidates, ctx)
    selected = ensure_reference_path(selected, candidates, ctx)
    selected = ensure_conflict_visibility(selected, candidates, ctx)
    selected = ensure_active_vs_historical_distinction(selected, candidates, ctx)
    return selected
```

---

## Attention Invariants

- The system MUST not increase visible complexity merely because more relevant items exist.
- Every surfaced item must justify its cognitive cost.
- Strong prediction confidence does not create extra display budget.
- Conflict and provenance truth must survive budget pruning.
- Default modal view must remain understandable without instruction.
- Under uncertainty, the system must show less.

### Anti-goals

Agents must NOT:

- surface all relevant relationships at once
- equate prediction confidence with display entitlement
- introduce multiple simultaneous emphasis systems
- solve overflow by shrinking everything until unreadable
- rely on legends to explain dense encodings
- allow extra indicators simply because each one is small

Tiny clutter is still clutter.

### UX consequences

Busy task note behavior:

- top 2 to 3 task edges appear strongly
- 1 to 2 supporting references are visible
- conflict remains visible
- conceptual neighbors collapse to counts or grouped faint context
- history stays mostly hidden unless requested

Concept exploration behavior:

- high-ambiguity conceptual links incur higher attention cost
- fewer expensive links pass selection
- conceptual exploration remains calm and interpretable

### Doctrine lines

- The system must optimize for attention, not disclosure.
- More truth exists than can be shown at once; surfacing is the art of choosing what deserves the user’s mind right now.
- Prediction does not buy more screen; it must compete within the same cognitive budget as everything else.

---

## Suggested Components for Attention Layer

- `AttentionBudgetService`
- `SurfaceQuotaManager`
- `SurfaceSelectionEngine`
- `PreservationRulesEngine`

Responsibilities:

- `AttentionBudgetService`: define per-mode and per-intent budgets.
- `SurfaceQuotaManager`: track quota usage (prediction, historical, explanation, conflicts, etc.).
- `SurfaceSelectionEngine`: choose visible nodes/edges/UI signals under budget.
- `PreservationRulesEngine`: guarantee essential truths survive pruning.

### Final rule

Under uncertainty, the system MUST become quieter, not louder.

---

## Promotion and Artifact Transitions

### Principle

A note is the atomic unit of work.

A note may evolve into:

- a task
- a project
- a reference hub
- a review item
- a derived artifact

This evolution MUST NOT:

- break lineage
- duplicate context
- lose relationships
- require migration into a different object system

Promotion is a state transition, not a copy.

### Core rule

A note never stops being a note.

All higher-order objects are views, states, or roles applied to the same underlying entity.

No parallel systems. No shadow objects. No “task version of a note.”

### Promotion states

Each note can hold one or more roles.

Base state:

- `note` (always true)

Optional roles:

- `task`
- `project`
- `reference_hub`
- `review_item`
- `artifact`

Roles are not mutually exclusive, but multi-role combinations should be intentional.

### Promotion lifecycle

Allowed transitions:

- `note → task`
- `note → project`
- `note → reference_hub`
- `note → review_item`
- `note → artifact`
- `task → artifact`
- `task → historical` (completed)
- `project → historical` (closed)
- `review_item → task` (approved work)
- `review_item → artifact` (accepted output)
- `artifact → superseded` (replaced)

### Role definitions

`task`

- actionable work role
- required: `status` (`open`, `in_progress`, `blocked`, `done`)
- optional due context and dependencies
- behavior: boosts `task_dependency`, raises operational relevance, strongly influences `task_execution` intent

`project`

- related-work cluster role
- behavior: boosts relevance between member notes; influences ranking/grouping; remains graph-based (no forced tree)

`reference_hub`

- stable source/knowledge anchor role
- behavior: boosts `references`, attracts inbound links, stays durable and low-decay

`review_item`

- decision-checkpoint role
- behavior: surfaces in `review_commit` intent; gathers proposed relationships; supports confirm/reject flows before promotion

`artifact`

- output role (document/report/code/decision/final insight)
- behavior: creates strong `derived_from` lineage, may supersede earlier notes, remains durable and traceable

### Promotion rules

General:

- Promotion MUST NOT create a new entity.
- Promotion MUST preserve all relationships.
- Promotion MUST update lifecycle relevance.
- Promotion MAY add role-required properties.
- Promotion MUST be reversible where appropriate.

Task promotion:

- promote relevant `task_dependency` and `action_source` relationships
- increase operational relevance
- bias intent toward execution
- preserve original content/context

Artifact creation:

- create `derived_from` relationships to source notes
- mark upstream notes as contributing context
- optionally create `supersedes`
- increase provenance weight
- reduce conceptual duplication pressure

Project formation:

- cluster related notes with `belongs_to_project`
- increase intra-project ranking
- do not enforce strict hierarchy
- allow cross-project membership

Review flow:

- expose proposed relationships
- allow `confirm → confirmed` and `reject → rejected`
- allow promotion into `task`, `artifact`, or `reference_hub`

### Promotion triggers

Promotion may occur via:

- explicit user action (`convert to task`, `mark as project`, `promote to artifact`)
- subtle system suggestion (`looks like task`, `acts as reference hub`, `ready as artifact`)

System suggestions MUST be explainable, dismissible, and never auto-promote.

### Relationship, lifecycle, intent, and attention integration

Promotion effects:

- `task`: boost task edges, increase activity weighting, decay irrelevant conceptual noise faster
- `artifact`: strengthen lineage, reduce parallel conceptual links, may trigger supersession
- `reference_hub`: stabilize inbound references and durability
- `project`: affect ranking/grouping, not truth semantics

Lifecycle coupling:

- new task relationships → `active`
- confirmed review decisions → `confirmed`
- superseded artifacts → `superseded`
- completed tasks → `historical`
- rejected suggestions → `rejected`

Intent coupling:

- `task` → `task_execution`
- `reference_hub` → `reference_lookup`
- `artifact` → `review_commit` or `history_trace`
- `project` → context shaping
- `review_item` → `review_commit`

Attention coupling:

Promotion MUST NOT increase attention budget. It must reallocate visibility toward relevant structures and suppress irrelevant noise.

### Anti-goals

Agents must NOT:

- create separate object systems by role
- copy note content into new entities during promotion
- lose lineage during transitions
- allow promotion to explode visible complexity
- auto-promote without explicit confirmation
- impose rigid workflow constraints that fight user intent

### Definition of success

A successful system allows:

- thought → task without friction
- task → artifact without context loss
- artifact → origin trace instantly
- project emergence from related work
- review as a clean decision checkpoint

All without duplicating systems, duplicating data, or breaking relationships.

### Doctrine lines

- A note is not replaced when it becomes something else. It becomes more than it was.
- Promotion changes how a note participates in the system, not what it is.
- All work artifacts must remain traceable to their origin.

### Buildable model and services

Extend note model with role/state properties:

```text
Note
- id
- content
- roles: set[role]
- task_status (optional)
- project_ids
- review_status (optional)
- artifact_type (optional)
```

Role flags:

- `task`
- `project`
- `reference_hub`
- `review_item`
- `artifact`

Create:

- `PromotionService`
- `RoleManager`
- `ArtifactLineageService`

Reference logic:

```python
def promote_to_task(note):
    note.roles.add("task")
    note.task_status = "open"
    boost_relationships(note, type="task_dependency")


def promote_to_artifact(note, sources):
    note.roles.add("artifact")
    for src in sources:
        create_relationship(src, note, type="derived_from", state="confirmed")
```

---

## Workflow Suggestions

### Principle

The system MAY suggest likely next actions based on:

- note roles
- relationship lifecycle
- intent context
- lineage
- historical workflow patterns

Suggestions MUST remain:

- explainable
- dismissible
- non-blocking
- subordinate to explicit user intent

Suggestions MUST NOT:

- auto-execute promotions
- silently mutate relationships
- create irreversible workflow state
- replace human review where review is required

The system should suggest the next useful move, not presume authority.

### Suggestion classes

Allowed classes:

- `promote_to_task`
- `promote_to_review_item`
- `promote_to_reference_hub`
- `promote_to_artifact`
- `link_missing_source`
- `resolve_conflict`
- `confirm_relationship`
- `review_supersession`
- `close_or_archive_task`
- `group_into_project`
- `trace_lineage`
- `open_supporting_reference`

Do not add classes casually; update ontology first.

### Suggestion generation and visibility rules

- Suggestions MUST come from real graph/lifecycle/lineage/task conditions, not generic heuristics alone.
- Suggestions MUST include one-sentence explanation, confidence, and evidence basis.
- Suggestions MUST be ephemeral unless explicitly acted on.
- Suggestions are part of the attention budget.
- Default modal SHOULD show 0–2 suggestions max.
- Under uncertainty, show fewer suggestions; prefer none over weak noise.

### Explainability and safety rules

Every shown suggestion must answer:

- what is suggested
- why now
- what evidence supports it

If explanation is weak, suggestion strength must be weak or absent.

Safety requirements:

- do not repeatedly resurface rejected suggestions without new evidence
- do not trap users in one workflow pattern
- do not hide conflicting/critical context for convenience
- do not suggest promotion when lineage/provenance is incomplete
- do not elevate speculative conceptual links into operational actions without reinforcement

Explicit user action always overrides suggestion logic.

### Review-sensitive rules

For suggestions affecting supersession, conflict resolution, artifact creation, lineage, or review status: prefer review-aware flow before structural transition.

When in doubt, route through review.

### Suggestion ontology (class semantics)

`promote_to_task`: actionable intent + dependencies + execution context; avoid when mostly historical or provenance would be obscured.

`promote_to_review_item`: unresolved proposed relationships/conflicts/near-promotion ambiguity.

`promote_to_reference_hub`: high inbound references, repeated support usage, stable source behavior.

`promote_to_artifact`: stabilized note, strong lineage, readiness from task/review context, downstream output use.

`link_missing_source`: operational/artifact-like usage with missing provenance.

`resolve_conflict`: active unresolved contradictions, duplicate/supersession ambiguity, blocked workflow.

`confirm_relationship`: inferred link with strong reinforcement and strong explanation.

`review_supersession`: overlapping old/new artifacts or notes with likely replacement signal.

`close_or_archive_task`: completed/stale task with no active dependencies.

`group_into_project`: repeated co-activity with shared context signals (grouping, not confinement).

`trace_lineage`: provenance/history intent with deep derivation chain.

`open_supporting_reference`: execution context where a source is highly likely needed next.

### Suggestion lifecycle

Allowed states:

- `candidate`
- `surfaced`
- `accepted`
- `dismissed`
- `suppressed`

Rules:

- begin as `candidate`
- become `surfaced` only if utility + confidence + attention thresholds pass
- `accepted` when user acts
- `dismissed` when user declines
- `suppressed` when displaced by higher-priority context

Dismissed suggestions should incur penalty. Accepted suggestions may reinforce pattern model. Suppressed suggestions decay and require new evidence to return.

### Suggestion state machine

| From | To | Condition |
|---|---|---|
| candidate | surfaced | confidence + utility + budget pass |
| surfaced | accepted | user acts |
| surfaced | dismissed | user dismisses |
| dismissed | candidate | new evidence after cooldown |
| surfaced | suppressed | higher-priority context displaces it |
| suppressed | candidate | context changes or confidence rises |

No suggestion remains permanently surfaced because it was once relevant.

### Suggestion scoring model

```text
suggestion_score =
    action_readiness
    × intent_alignment
    × lineage_completeness
    × workflow_pattern_support
    × trustworthiness
    × urgency
    × reversibility_modifier
```

Apply penalties for:

- recent dismissal
- weak explanation
- low-confidence inferred evidence
- missing provenance
- redundant suggestion repetition
- conflict with explicit user behavior
- high cognitive cost for low likely benefit

Under weak footing, suggestion behavior should get quieter.

### Services

Create:

- `WorkflowSuggestionEngine`
- `SuggestionEvidenceBuilder`
- `SuggestionLifecycleService`
- `SuggestionPolicyGuard`

Responsibilities:

- `WorkflowSuggestionEngine`: generate candidates from note/graph state
- `SuggestionEvidenceBuilder`: produce explanation + structured evidence payload
- `SuggestionLifecycleService`: track candidate/surfaced/accepted/dismissed/suppressed transitions
- `SuggestionPolicyGuard`: enforce safety, attention quotas, reversibility thresholds, and review requirements

Reference pseudocode:

```python
def generate_workflow_suggestions(note, context):
    candidates = []

    if should_suggest_task(note, context):
        candidates.append(make_suggestion("promote_to_task", note, context))

    if should_suggest_reference_hub(note, context):
        candidates.append(make_suggestion("promote_to_reference_hub", note, context))

    if should_suggest_missing_source(note, context):
        candidates.append(make_suggestion("link_missing_source", note, context))

    if should_suggest_conflict_resolution(note, context):
        candidates.append(make_suggestion("resolve_conflict", note, context))

    return candidates


def rank_suggestions(candidates, attention_context):
    scored = []
    for s in candidates:
        score = compute_suggestion_score(s)
        if violates_policy(s):
            continue
        scored.append((s, score))

    ranked = sorted(scored, key=lambda x: x[1], reverse=True)
    return fit_within_suggestion_quota(ranked, attention_context)


def build_explanation(suggestion):
    if suggestion.kind == "promote_to_task":
        return "This note has active downstream dependencies and appears ready for execution."
    if suggestion.kind == "link_missing_source":
        return "This note is being used operationally but lacks a clearly linked supporting source."
    if suggestion.kind == "review_supersession":
        return "A newer related artifact appears to overlap this one and may warrant supersession review."
```

### UI rules

Preferred suggestion UI:

- tiny "Next likely move" strip
- one or two compact suggestion chips
- subtle inline affordance near relationship strip
- optional "Why this?" expansion

Avoid:

- large modal banners
- multiple concurrent suggestion cards
- aggressive animation
- command-like framing

### Doctrine lines

- Suggestions must emerge from evidence, not eagerness.
- The system may suggest the next useful move, but suggestion never equals truth.
- A weak suggestion should disappear gracefully rather than argue for itself.

### Integration rules

With lifecycle:

- suggestions cannot override lifecycle
- lifecycle is evidence input only

With intent:

- suggestions may align with intent
- suggestions may not erase conflicting truth

With attention budget:

- suggestions compete within same budget
- standard modal quota remains 0–2

With promotion:

- accepted suggestions may trigger promotion flow
- promotion still obeys lineage and review rules

With rejection/suppression memory:

- dismissed suggestions cool off
- resurfacing requires new evidence

### Final rules

- Under uncertainty, the system SHOULD show fewer suggestions, not more.
- Suggestions are guidance, not authority.

---

## Review Protocols and Approval Surfaces

### Principle

Review is the system’s mechanism for:

- confirming truth
- resolving ambiguity
- protecting provenance
- preventing silent drift

Review MUST be applied selectively, not universally.

The system SHOULD introduce friction only when:

- the decision affects structure
- the decision affects trust
- the decision affects lineage
- the decision is hard to reverse

### What requires review

The system MUST require or strongly suggest review before:

- confirming high-impact inferred relationships
- resolving `conflicts_with`
- merging or collapsing `duplicate_of`
- applying `supersedes`
- promoting to artifact (in most cases)
- promoting to reference_hub (if widely referenced)
- removing or weakening provenance links
- restructuring project groupings that affect many notes

The system SHOULD NOT require review for:

- simple traversal
- low-impact conceptual links
- reversible UI-only changes
- ephemeral suggestions

### Review types

Define explicit review modes:

1. **Relationship Review**
   - Used for confirming/rejecting inferred links.
   - Actions: `confirm → confirmed`, `reject → rejected`, `defer → remain proposed`.

2. **Conflict Review**
   - Used for contradictions, overlapping instructions, inconsistent artifacts.
   - Actions: resolve one path, mark coexisting (rare), escalate/defer.
   - Must preserve both sides until resolved.

3. **Supersession Review**
   - Used for replacing older notes/artifacts.
   - Actions: confirm/reject/defer supersession.
   - Effects: demotes old structure while preserving lineage.

4. **Artifact Review**
   - Used for finalization to output artifacts.
   - Actions: `approve → artifact`, `revise → active note`, `reject → non-artifact`.
   - Must ensure lineage completeness and source presence.

5. **Structural Review**
   - Used for project grouping and large restructuring.
   - Actions: accept, refine, reject grouping.

### Review surface design

Review surfaces must be:

- focused
- contextual
- minimal
- decision-oriented

Not dashboards, inboxes, or endless queues.

### Where review appears

Review should appear:

- inline with the modal (preferred)
- as a lightweight panel or strip
- as part of workflow suggestions
- as contextual overlays when needed

Avoid forcing users into a separate review screen unless necessary.

### Review presentation

Each review item MUST show:

- what is being reviewed
- what will change
- why the system suggests it
- what evidence supports it
- what the consequences are

Example:

> "These two notes appear to duplicate each other based on shared source and repeated usage. Confirm merge or keep separate?"

### Actions must be simple

Each review surface should offer:

- confirm
- reject
- defer

Optional:

- refine (edit before confirming)

Avoid complex multi-step flows unless absolutely required.

### Review lifecycle

Review item states:

- `pending`
- `in_review`
- `resolved`
- `deferred`
- `expired`

Rules:

- `pending → surfaced` when relevant
- `in_review` while user is interacting
- `resolved` when decision is made
- `deferred` hides item temporarily
- `expired` when no longer relevant due to system change

### Expiration rules

A review should expire when:

- underlying relationships change significantly
- confidence drops
- newer evidence replaces it
- it becomes irrelevant to current structure

Do not keep stale review items around.

### Review priority

Priority tiers:

High:

- conflicts
- supersession
- artifact promotion
- duplicate collapse

Medium:

- confirming strong inferred relationships
- missing source linkage

Low:

- weak conceptual suggestions
- low-impact structural grouping

Higher priority items surface sooner and persist longer (within attention limits).

### Integration with lifecycle, intent, and attention

Lifecycle effects:

- `confirm → confirmed` or `active`
- `reject → rejected`
- `supersede → superseded`
- conflict resolution updates/removes `conflicts_with`
- artifact approval strengthens `derived_from` lineage

Intent visibility:

- more visible in `review_commit`, `conflict_resolution`, `history_trace`
- less visible in fast task execution or casual concept exploration

Attention rules:

- review items consume attention budget
- max 1–2 active review prompts in modal view
- high-priority review may displace lower-priority suggestions
- review must not overwhelm core content

### Safety rules

The system MUST NOT:

- auto-resolve conflicts
- auto-merge duplicates
- auto-confirm high-impact inferred relationships
- auto-supersede artifacts without review

The system MAY auto-confirm low-risk, highly reinforced relationships only with an audit trail.

### Explanation requirement

Every review MUST include:

- clear reason
- supporting evidence
- expected outcome

If the system cannot explain a review, it must not request it.

### Suggested services

Create:

- `ReviewEngine`
- `ReviewItemBuilder`
- `ReviewLifecycleService`
- `ReviewPriorityManager`
- `ReviewSurfaceController`

Responsibilities:

- `ReviewEngine`: generate review candidates from graph + lifecycle + intent
- `ReviewItemBuilder`: build structured review items with evidence
- `ReviewLifecycleService`: track review state transitions
- `ReviewPriorityManager`: rank review importance
- `ReviewSurfaceController`: determine when/how review appears in UI

Reference pseudocode:

```python
def generate_review_items(note, context):
    items = []

    if has_conflicts(note):
        items.append(make_conflict_review(note))

    if has_strong_inferred_links(note):
        items.append(make_relationship_review(note))

    if candidate_for_supersession(note):
        items.append(make_supersession_review(note))

    if ready_for_artifact(note):
        items.append(make_artifact_review(note))

    return items


def select_review_items(items, attention_context):
    ranked = sort_by_priority(items)

    visible = []
    for item in ranked:
        if exceeds_review_quota(visible, attention_context):
            break
        visible.append(item)

    return visible
```

### UX behavior examples

Conflict example:

- show one conflict review prompt
- keep both sides visible
- allow resolve/defer/inspect

Artifact promotion example:

- suggest artifact review
- show source lineage
- allow approve or revise

Duplicate example:

- suggest merge with evidence
- allow confirm or keep separate

### Doctrine lines

- Review is applied where mistakes are costly, not where actions are frequent.
- The system must never silently decide what should be explicit.
- Ambiguity should be surfaced, not hidden.
- A good review surface reduces uncertainty without increasing friction.

---

## Adaptive Workflow Learning

### Principle

The system MAY learn from user behavior to improve ranking and suggestions.

Learning MUST:

- remain probabilistic, not deterministic
- improve usefulness without reducing optionality
- remain explainable
- decay over time
- respect user override

The system must adapt without trapping users inside past behavior.

### Allowed learning signals

The system MAY learn:

- common traversal sequences
- frequently co-accessed notes
- task execution flows
- preferred reference sources
- common promotion paths (e.g., note → task → artifact)
- review confirmation/rejection tendencies
- conflict resolution tendencies
- time-based usage patterns
- workspace/project-specific habits

### What must not be learned blindly

The system MUST NOT:

- assume repeated patterns are always correct
- permanently suppress alternatives
- reinforce incorrect behavior without reevaluation
- treat rare but critical actions as unimportant
- encode sensitive/irrelevant personal traits
- make irreversible structural decisions from learned patterns alone

Learning is advisory, not authoritative.

### Pattern model

Constrained pattern types:

- `transition_pattern`
- `relationship_confirmation_pattern`
- `workflow_pattern`
- `reference_pattern`
- `review_pattern`

Pattern structure:

```text
Pattern
- id
- type
- context_scope (global | workspace | project)
- trigger_conditions
- outcome
- success_score
- frequency
- last_observed_at
- decay_rate
- confidence
```

### Pattern scoring

Patterns must earn influence.

```text
pattern_strength =
    frequency
    × success_score
    × recency_decay
    × context_match
    × consistency
```

Where:

- `frequency`: how often observed
- `success_score`: whether outcomes are stable/positive
- `recency_decay`: older patterns weaken
- `context_match`: workspace/project alignment
- `consistency`: low variance in outcomes

### Success signals

Patterns count as successful when they contribute to:

- task completion
- artifact creation
- confirmed relationships
- reduced conflict
- repeated reuse
- stable lineage

Repetition without successful outcomes is noise.

### Decay rules

Patterns MUST decay over time.

Decay triggers:

- not used recently
- contradicted by new behavior
- repeatedly ignored suggestions
- context mismatch

Old patterns must fade to prevent fossilized behavior.

### System influence boundaries

Learning MAY influence:

- intent scoring
- relationship ranking
- suggestion ranking
- prediction confidence
- prefetching
- subtle ordering

Learning MUST NOT:

- alter lifecycle state directly
- override explicit user actions
- remove conflicting context
- bypass review requirements

### Exploration vs exploitation

The system MUST balance exploitation and exploration.

Rules:

- do not always surface only top learned pattern
- occasionally allow second-best/new candidates
- avoid lock-in to one dominant path
- preserve diversity in surfacing

### Explainability

Learned behavior must remain simply explainable, e.g.:

- "You often open this after reviewing similar tasks"
- "This reference is commonly used in your workflow"
- "You typically confirm this relationship type in this context"

If it cannot be explained simply, it should not strongly influence ranking.

### Safety rules

The system MUST:

- penalize patterns behind rejected suggestions
- reduce influence when patterns conflict with explicit corrections
- avoid reinforcing mistakes
- avoid overfitting to short-term behavior
- avoid learning from very sparse signals

### Pattern lifecycle

Pattern states:

- `emerging`
- `established`
- `weakening`
- `inactive`

Transitions:

- `emerging → established` (sufficient evidence)
- `established → weakening` (lower usage/success)
- `weakening → inactive` (decay threshold)
- `inactive → emerging` (rediscovered)

### Services

Create:

- `PatternCollector`
- `PatternStore`
- `PatternScoringEngine`
- `PatternDecayService`
- `PatternInfluenceEngine`

Responsibilities:

- `PatternCollector`: observe actions and record candidate patterns
- `PatternStore`: persist pattern data efficiently
- `PatternScoringEngine`: compute strength/confidence
- `PatternDecayService`: apply time-based decay
- `PatternInfluenceEngine`: apply pattern influence to ranking/suggestions

### Example flow

If users repeatedly follow `A → B → Reference C → complete task`, the system may slightly elevate `C` when `A` or `B` is opened—without forcing it and without outranking stronger structural signals.

### Reference pseudocode

```python
def apply_pattern_influence(candidate, context):
    patterns = get_relevant_patterns(candidate, context)

    influence = 1.0
    for p in patterns:
        influence *= (1 + p.strength * p.confidence * 0.1)

    return influence
```

Keep multipliers small; learned influence is seasoning, not the main ingredient.

### UX behavior

Learning should be mostly invisible.

Subtle outcomes:

- slightly reordered results
- more accurate likely-next surfacing
- fewer irrelevant suggestions
- smoother flow

Optional explicit cues:

- "You often do this next"
- "Common step in your workflow"

Avoid invasive tone such as "we know you" or deterministic phrasing.

### Doctrine lines

- The system may learn patterns, but it must never assume they define the user.
- Repetition is not truth; only successful outcomes deserve reinforcement.
- Learning should make the system quieter and more accurate, not louder and more confident.
