# atom_notes

## Manual QA Checklist

- [ ] Verify summoning the note UI works from the global shortcut while no app is focused.
- [ ] Verify summoning while actively editing text in another app does not inject stray characters into the note.
- [ ] Verify accidental `Ctrl` key taps/releases (without full shortcut chord) do not trigger summon/dismiss behavior.
- [ ] Verify dismissing the UI with keyboard and pointer interactions works when idle.
- [ ] Verify dismissing during an active drag operation safely cancels drag state without leaving ghost UI.
- [ ] Verify creating, editing, pinning, archiving, restoring, and deleting notes via mouse and keyboard paths.
- [ ] Verify attempting to archive a pinned note follows expected product behavior (block with message or auto-unpin then archive).
- [ ] Verify focus returns to the previously active app/window after dismiss.
- [ ] Verify note list scroll position restores when reopening within the same session.
- [ ] Verify long-note editing preserves cursor/selection after quick hide/show cycles.

## Edge-Case Checklist

- [ ] **Accidental Ctrl presses**: rapid `Ctrl` down/up spam should not open, close, or corrupt state.
- [ ] **Summon while editing**: summon shortcut pressed mid-typing should pause safely and preserve external editor text.
- [ ] **Archive pinned note**: ensure deterministic handling for pinned+archived conflict (no duplicate state).
- [ ] **Restore after restart**: restart app/OS and confirm notes, pin state, archive state, and ordering persist.
- [ ] **Creating many notes**: bulk-create 100+ notes; verify performance, ordering, search/filter latency, and no dropped items.
- [ ] **Dismiss during drag**: while dragging/reordering, dismiss via shortcut or click-outside and confirm drag cleanup.
- [ ] **Focus/scroll restore failures**: simulate failed focus restore or stale scroll target and verify graceful fallback.

## Unit / Integration Test Targets

### Shortcut and Input Handling
- Unit-test shortcut parser/state machine for partial key chords, repeated keydown, and modifier-only events.
- Unit-test debounce/guard logic to prevent accidental `Ctrl` press from triggering summon.
- Integration-test summon/dismiss when host app input is active to ensure no key leakage.

### Note State Transitions
- Unit-test note model invariants: `pinned`, `archived`, `deleted` are mutually consistent.
- Unit-test archive behavior for pinned notes (expected policy explicitly asserted).
- Integration-test create/edit/pin/archive/restore/delete lifecycle across repository/storage layer.

### Persistence and Restart Recovery
- Integration-test persistence writes for note content, ordering, pin/archive metadata, and timestamps.
- Integration-test cold restart recovery including corrupted/partial persistence fallback behavior.
- Integration-test focus/scroll restore using persisted UI state with missing target note IDs.

### Scale and Interaction Robustness
- Integration-test creating many notes (100/500/1000) with timing assertions for acceptable latency bounds.
- Integration-test drag-and-drop reorder interrupted by dismiss, escape, or window blur.
- Integration-test rapid summon/dismiss cycles while background saves are pending.

### Accessibility and UX Regression Guards
- Integration-test keyboard-only flows (open, navigate list, edit, archive, restore, dismiss).
- Integration-test focus return contract to previously focused window/control after dismiss.
- Snapshot/UI regression test for pinned/archived badges and empty/error states.
