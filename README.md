# Atomic Notes (atom_notes)

A local-first, graph-aware note system where notes are living artifacts—not static text. Each note can evolve in structure, context, and meaning over time, while preserving its full history and relationships.


---

Core Idea

Traditional tools fragment work:

Notes (ideas)

Tasks (execution)

Documentation (knowledge)


Atomic Notes treats all of these as the same underlying object: a note that can shift roles depending on context.

> A note is not a file. It is a node in a system of thought.




---

What Makes This Different

1. Notes as Atoms

Each note is a small, self-contained unit:

Text, checklist, code, links, attachments

Embedded AI chat scoped to the note

Persistent context


Notes can belong to multiple "molecules" (contexts, workflows, or topics) simultaneously.


---

2. Relationships Are First-Class

Notes are connected through explicit and inferred relationships:

Source → target links

Contextual associations ("related to", "derived from", "impacts")

Time-aware relevance (recent vs stale)


The system ranks and surfaces relationships dynamically rather than relying on folders.


---

3. Graph-Driven Discovery

Instead of navigating folders, you query the system:

Concepts ("Reg W")

Actions ("submit")

Inputs ("fed report")


The system responds by constructing a living graph view of relevant notes and relationships.


---

4. State Without Fragmentation

A note can evolve without being recreated:

Note → Task → Project

Research → Decision → Execution


All history, attachments, and AI context remain intact.


---

5. Embedded AI Per Note

Each note includes its own AI context:

Ask questions about the note

Analyze attachments and links

Preserve reasoning history locally


This avoids the typical "stateless chat" problem.


---

Example Use Cases

Research Hopper

Quickly collect links (articles, videos) into notes and triage them:

Open → evaluate → discard or enrich

Keep only what matters


Regulatory / Procedure Analysis

Ingest documents (e.g., policies, eCFR)

Break into atomic notes

Track relationships and downstream impacts


Workflow Intelligence

Map procedures into connected notes

Identify automation opportunities

Surface dependencies and risks


Personal Knowledge System

Replace scattered notes, bookmarks, and docs

Build a connected knowledge graph over time



---

Architecture (High-Level)

Frontend

Desktop app (Tauri)

Interactive canvas + graph visualization

Note-centric UI with embedded AI


Data Model

Notes (atoms)

Relationships (edges)

Workspaces / contexts (optional grouping)


Core Behaviors

Relationship scoring + ranking

Stale vs active signal handling

Deterministic graph curation (bounded node count)



---

Key Design Principles

Local-first: Your data stays with you

Composable: Small units combine into larger meaning

Explainable: Relationships and rankings are inspectable

Low friction: Capture should be immediate

Calm UI: Reduce visual noise, emphasize clarity



---

Current Status

This project is under active development.

Recent areas of focus:

Graph ranking and stale relationship handling

Capture flow simplification

UI clarity and reduced cognitive load

Deterministic graph rendering



---

Getting Started

Prerequisites

Node.js (LTS recommended)

npm or pnpm

Rust + Cargo (for Tauri)


Install

git clone https://github.com/your-username/atom_notes.git
cd atom_notes
npm install

Run (Tauri Dev)

npm run tauri dev

> Note: On Linux, you may need system dependencies like webkit2gtk and javascriptcoregtk installed.




---

Roadmap (Directional)

[ ] Graph query-first entry experience

[ ] Document ingestion pipeline (docx, PDF, web)

[ ] Automated atomization + relationship extraction

[ ] Visual relationship editing tools

[ ] Time-based insights (drift, staleness, resurfacing)

[ ] Multi-agent workflows for analysis and enrichment



---

Contributing

This is currently a personal project, but feedback and ideas are welcome.

If you’re exploring the repo:

Focus on core primitives (notes + relationships)

Avoid premature abstraction

Keep UI decisions grounded in clarity over novelty



---

Philosophy

> From complexity to clarity.



The goal is not to store more information, but to make relationships visible so that understanding emerges naturally.


---

License

TBD