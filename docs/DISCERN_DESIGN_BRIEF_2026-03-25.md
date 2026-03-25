# Atom Notes / Discern Design Brief (March 25, 2026)

This document captures the current UI/UX direction: make Atom Notes calmer, clearer, and more trustworthy while preserving rigorous semantic structure.

## Product Direction

Atom Notes should feel like:
- a calm thinking tool
- an intent-first interface
- an AI-visible, trust-preserving system
- a meaning-driven product where relationships and structure are legible

Atom Notes should **not** feel like:
- a generic block editor
- overlapping helper systems
- hidden AI behavior without provenance
- decorative UI clutter that weakens readability

## Design Principles

1. **Object continuity** — a note should remain recognizably the same object across shelf, read, and edit.
2. **Intent over implementation** — expose user goals, not internal categories.
3. **Readability first** — semantic signals must never reduce legibility.
4. **AI visibility** — authored, generated, and inferred content must be distinguishable.
5. **Honest confidence** — pending, inferred, and ambiguous states must never appear fully certain.
6. **Trust includes repair** — when AI is wrong, recovery must be visible and respectful.
7. **Mobile intentionality** — mobile is not compressed desktop; it needs a dedicated navigation hierarchy.
8. **Fewer, stronger signals** — prefer a small number of clear cues over many weak indicators.

## Exploration Tracks

### Track A — Mobile Navigation
Explore:
- breadcrumb dropdown orientation
- curtain-style filters
- reduced top chrome
- role separation between orientation, filtering, and note interaction

Deliver:
- 2–3 concepts
- recommendation with tradeoffs

### Track B — Semantic Thread Color
Explore:
- thread-driven color identity
- confirmed vs inferred visual treatments
- neutral handling for ambiguous/mixed thread states
- continuity across shelf/read/edit

Deliver:
- semantic color rules
- confirmation-state visuals
- accessibility/contrast validation

### Track C — AI / Trust Layer Visual Language
Explore:
- authored vs suggested vs inferred styling
- Trust Layer accent family
- confidence/consequence markers
- lightweight provenance cues

Deliver:
- visual language proposal
- cross-surface usage examples

### Track D — Trust Repair Flows
Explore:
- incorrect classification
- bad inference
- low-confidence suggestion handling
- revoke/reclassify/unlink controls

Deliver:
- repair interaction model
- copy guidance
- state transitions

### Track E — Rams Reduction Pass
Explore:
- remove/collapse controls that do not serve primary intent
- simplify read/edit transitions
- reduce persistent helper scaffolding

Deliver:
- subtraction-oriented recommendations
- before/after examples
- components to demote/hide/remove

## Implementation Sequence

1. Define thread-driven note identity system.
2. Define AI / Trust Layer visual language.
3. Prototype mobile breadcrumb + curtain filter concepts.
4. Establish confidence/consequence signaling hierarchy.
5. Design trust repair flows.
6. Run Rams reduction pass on note-open surfaces.
7. Validate against accessibility and interaction guidelines.

## Banned Moves

- Adding UI chrome without clear intent mapping
- Reducing readability through semantic text color overload
- Breaking note continuity between read/edit
- Inconsistent AI signaling across surfaces
- Showing inferred states with confirmed certainty
- Hiding critical mobile actions without clear replacement
- Decorative color use where color is semantic
- Leaving trust repair implicit

## Success Criteria

This direction succeeds if:
- mobile orientation improves
- note color communicates semantic identity
- AI output is clearly identifiable
- confidence/consequence are legible without visual noise
- interaction feels calmer and less mechanical
- users can recover from AI mistakes cleanly
- trust increases through transparent behavior

## Evaluation Checklist (for design reviews)

- [ ] Is the primary action obvious within 2–3 seconds?
- [ ] Does this reduce or increase persistent visual chrome?
- [ ] Can users distinguish authored, generated, and inferred states instantly?
- [ ] Are inferred states clearly marked as pending/uncertain?
- [ ] Does semantic styling preserve comfortable reading contrast?
- [ ] Is there a visible correction path for wrong AI behavior?
- [ ] Are mobile controls reachable and non-duplicative?
- [ ] If removed, would this element materially harm user intent completion?

## Decision Filter

Before shipping UI changes, confirm:
- Is this useful?
- Is this understandable?
- Is this visually quiet?
- Is this necessary?
- Does this serve user intent or system convenience?
