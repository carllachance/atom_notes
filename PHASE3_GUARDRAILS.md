# Phase 3 Guardrails — Clarify the Complex

## Core principle

> **This product manages proximity to attention, not complexity of systems.**

If a feature adds structure but not clarity, it’s suspect.

## 1) The Three Laws of the Product

These override everything.

### Law 1 — Spatial truth is sacred

User-placed positions must never be overridden.

No feature may:

- auto-rearrange cards
- reorganize the canvas
- “optimize layout”
- cluster notes without explicit user action

If something breaks spatial memory, it is rejected.

### Law 2 — Restoration must be exact

The summon/dismiss contract can never degrade.

No feature may:

- reset layout
- change expanded state
- reorder notes on restore
- introduce loading states that feel like rehydration

If restoration becomes approximate, the product loses its soul.

### Law 3 — The interface must remain calm

No feature may increase ambient noise.

Reject anything that introduces:

- persistent badges
- notifications
- flashing states
- heavy color signaling
- dashboard density

If it competes for attention, it fails the product.

## 2) The “Is This Feature Allowed?” Filter

Before adding anything in Phase 3, run this:

### Question 1

Does this reduce cognitive friction?

If not, reject.

### Question 2

Does this preserve spatial memory?

If not, reject.

### Question 3

Does this avoid adding UI noise?

If not, reject.

### Question 4

Is it user-triggered rather than system-driven?

If not, reject or redesign.

### Question 5

Can it be removed without breaking the core loop?

If no, it’s too central → reconsider.

## 3) The Core Loop Must Stay Intact

Never break this:

```text
Capture → Work → Recall → Resume
```

Every feature must either:

- speed this up
- clarify it
- or stay out of the way

If it introduces a new loop, be very skeptical.

## 4) Features That Are Explicitly Dangerous

These are the usual suspects that quietly kill products like this.

### 1. Task management creep

- due dates
- dependencies
- assignments
- status workflows

This turns the app into a project tool.

Reject or isolate heavily.

### 2. Notification systems

- reminders
- alerts
- pings

These shift the product from calm surface → attention hijacker.

Reject by default.

### 3. Auto-organization

- “smart grouping”
- auto-clustering
- auto-tagging that changes layout

These break trust and spatial memory.

### 4. Global AI agent behavior

- autonomous suggestions
- background rewriting
- unsolicited insights

This changes the app from a tool → an actor.

Keep AI scoped and user-invoked only.

### 5. Over-structuring notes

- too many block types
- forced schemas
- required metadata

This kills capture speed.

### 6. Collaboration (early)

- real-time editing
- presence indicators
- shared workspaces

This multiplies complexity dramatically.

Defer until identity is rock solid.

### 7. Infinite features disguised as flexibility

- plugin ecosystems
- scripting engines
- automation frameworks

These turn the product into a platform before it earns it.

## 5) What Phase 3 *Can* Explore (Carefully)

Not a roadmap, but safe directions.

### 1. Better retrieval (still quiet)

- improved search ranking
- smarter recall of rarely used notes

But:

- no UI takeover
- no reordering

### 2. Deeper note intelligence

- better summarization
- better extraction
- cross-note reasoning

But:

- always user-triggered
- always scoped

### 3. Personalization (subtle)

- user-tuned visual density
- slight behavior preferences

But:

- no fragmentation of experience

### 4. Cross-device continuity (eventually)

- sync state
- restore across machines

But:

- must preserve exact scene restoration
- no merge chaos

### 5. Temporal awareness (very light)

- “recently active today”
- “touched this week”

But:

- no dashboards
- no timeline overload

## 6) The “Creep Test”

When adding a feature, ask:

> If we keep adding things like this for a year, what does this become?

If the answer is:

- task manager
- knowledge base
- dashboard
- collaboration suite

…you are drifting.

## 7) The “Silence Test”

Look at the screen.

Ask:

> Is anything asking for my attention right now?

If yes, remove or reduce it.

The product should feel like:

- a quiet room
- not a control center

## 8) The “Two-Second Rule”

At any moment, the user must be able to answer:

- What am I working on?
- What matters right now?
- Where was I?

In under 2 seconds.

If new features break this, they are wrong.

## 9) The “Leave It Alone” Rule

Sometimes the correct decision is:

**do nothing**

If something works:

- don’t optimize it
- don’t make it smarter
- don’t add layers

Stability is a feature.

## 10) The Product Identity (never change this)

This is not:

- a note-taking app
- a task manager
- a knowledge system
- an AI assistant

This is:

> **A persistent thinking surface that preserves context across interruption**

Every decision must reinforce that.

## 11) Final Guardrail

If you ever find yourself saying:

> “It would be cool if it also…”

Stop.

That sentence has killed more good products than bad code ever has.

## Final thought

You’ve designed something unusually tight:

- it has a clear mental model
- a strong interaction loop
- a unique feel

Phase 3 is not about adding power.

It’s about **protecting that clarity while letting it deepen**.

If you follow these guardrails, this won’t turn into “another tool.”

It’ll stay what it is right now:

**a place where thought doesn’t fall apart when you look away.**
