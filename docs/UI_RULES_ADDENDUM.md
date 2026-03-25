# UI Rules Addendum (Implementation Guardrails)

This addendum operationalizes recurring implementation rules from:
- `docs/DISCERN_DESIGN_BRIEF_2026-03-25.md`
- `docs/frontend_consistency_audit.md`

It is intentionally short and tactical.

## 1) Shelf metadata safe zones
- Card timestamps belong in a dedicated metadata-safe row (`.shelf-item__footer`) or reserved corner region with protected spacing.
- Title rows must never share collision space with timestamps or overflow menus.
- One-line and two-line titles must remain stable at mobile widths.

## 2) Proximity grouping
- Section heading + count are one visual unit.
- Filter labels must stay attached to the controls they describe.
- Top controls should read as one rhythm block with the list they affect.

## 3) Floating footer spacing
- Any fixed/floating capture surface requires list scroll padding so final items can clear the overlay.
- Mobile shelf surfaces must include safe-area-aware bottom padding.
- Overlays should feel grounded (subtle backdrop), never like content is being cut off.

## 4) Segmented control clarity
- Mutually exclusive modes must read as one segmented group.
- Active state must be obvious without relying on decoration-only borders.
- Preserve mobile touch targets and keep mode semantics consistent across breakpoints.

## 5) Mobile modal anatomy
- Modal-like note surfaces should follow: header → content body → grouped secondary actions.
- Remove ghost slots and empty action regions.
- Prefer bottom-sheet behavior on mobile for utility-heavy or dense action surfaces.
- Keep centered modal behavior for focus-heavy reading/editing where object continuity is primary.
