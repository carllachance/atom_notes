# Atomic Notes (atom_notes)

### From complexity to clarity.

Atomic Notes is a local-first workspace where ideas don’t sit in folders—they connect, evolve, and surface themselves when they matter.

It’s designed for people who think in threads, not files.


---

The Vision

Most tools force you to decide too early:

Is this a note?

A task?

A document?


Atomic Notes removes that decision.

Everything starts as a note—and grows into whatever it needs to become.

> A note can become a task, a project, a research hub, or a decision trail—without ever losing its history.




---

What It Feels Like

You open the app and start typing:

> “daily fed report”



Instead of a list of files, the system responds with a living view:

Relevant notes appear

Connections form between them

Patterns emerge visually


You don’t go looking for information.

It assembles around your intent.


---

Core Experience

Capture Without Friction

Quickly drop anything into the system:

Thoughts

Links

Code snippets

Checklists

Attachments


No forms. No structure required.


---

Notes That Think With You

Each note includes its own AI context:

Ask questions about the note

Analyze attachments and links

Keep reasoning tied to the note itself


Your thinking stays grounded and persistent, not scattered across chats.


---

Relationships Over Folders

Instead of organizing notes manually, the system builds connections:

What relates to this?

What depends on this?

What changed because of this?


These relationships are:

Explicit (you define them)

Inferred (the system suggests them)

Time-aware (what’s relevant now vs what’s fading)



---

A Living Graph, Not a Static List

Your knowledge isn’t stored—it’s continuously shaped.

Important ideas surface

Old context fades but never disappears

Hidden connections become visible


The system doesn’t just store information.

It helps you see it.


---

Why It Exists

Work today is fragmented:

Notes live in one place

Tasks in another

Research somewhere else


This creates constant context switching.

Atomic Notes is an attempt to unify all of that into a single object:

> A living work artifact that carries its content, context, relationships, and reasoning together.




---

Example Moments

“What was I working on here?”

Open a note → see everything connected → instantly regain context.

“Does this impact anything?”

Add new information → relationships surface downstream effects.

“Where did this idea come from?”

Trace backwards through connected notes and decisions.

“What actually matters right now?”

The system prioritizes active, relevant connections automatically.


---

Design Principles

Local-first → your data stays with you

Low friction → capture should feel effortless

Explainable → relationships are visible, not hidden

Composable → small ideas build into larger systems

Calm by default → clarity over visual noise



---

What Exists Today

The current build focuses on the core interaction model and foundational behaviors:

Note creation with mixed content (text, links, lightweight structure)

Local-first desktop experience (Tauri-based)

Basic relationship modeling between notes

Graph-aware ranking of connected notes

Time-aware handling of relevance (active vs stale relationships)

Embedded AI per note (context stays scoped to the note)

Simplified capture flow (fast entry, minimal friction)

Deterministic graph curation (bounded, stable results)


The emphasis so far has been on getting the core primitives right: notes, relationships, and how they surface.


---

What Is In Progress

These areas are actively being refined:

Graph clarity (making relationships feel obvious, not technical)

Ranking logic (what surfaces first and why)

UI simplification (reducing cognitive load and visual noise)

Language consistency (making the system self-explanatory)



---

What Is Next (Near-Term)

Query-first entry (start with intent instead of navigation)

Improved visual graph exploration

Relationship editing and inspection tools

Better ingestion for links and structured content

Stronger AI-assisted relationship suggestions



---

Future Direction

Longer-term direction for the system:

Document ingestion pipeline (docx, PDF, web → atomic notes)

Automated atomization and relationship extraction

Time-based insight layer (drift, resurfacing, decay)

Multi-agent workflows for analysis and enrichment

Domain-specific workspaces (e.g., regulations, procedures)

Large-scale graph exploration without losing clarity



---

Getting Started

Prerequisites

Node.js (LTS)

npm or pnpm

Rust + Cargo (for Tauri)


Install

git clone https://github.com/your-username/atom_notes.git
cd atom_notes
npm install

Run

npm run tauri dev


---

Direction

Where this is heading:

Query-first interface (start with intent, not location)

Automated document ingestion and atomization

Stronger relationship inference

Visual exploration that scales with complexity

Multi-agent workflows for analysis and enrichment



---

Closing Thought

Most tools help you store more.

Atomic Notes is about helping you understand more.


---

License

TBD