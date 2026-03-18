# Relationship visual taxonomy

Atomic Notes uses three relationship categories that must stay legible even when color perception is reduced.

## Direct / explicit note relationships
- Meaning: user-created or explicitly confirmed note-to-note structure.
- Visual behavior: solid line, slightly heavier stroke, clearer related-node chip treatment.
- Color: still reflects relationship subtype (`related_concept`, `references`), but category meaning comes from solidity + weight.

## Inferred / contextual relationships
- Meaning: system-suggested or contextual note-to-note structure.
- Visual behavior: dashed line, lighter opacity, softer related-node chip treatment with dashed border.
- Color: subtype only; inference must still read as provisional without color.

## Project grouping relationships
- Meaning: shared project belonging, not semantic linkage.
- Visual behavior: broad ambient grouping ribbon plus project family halo/badge on member notes.
- Constraint: must never render like all-to-all semantic edges or compete with relationship-web semantics.

## Maintenance rule
If a visual change makes `direct`, `inferred`, and `project` hard to tell apart while the canvas is calm at rest, it is a regression.
