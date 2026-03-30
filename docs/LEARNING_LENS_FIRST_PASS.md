# Learning Lens first pass

## What this first pass does

1. **First-install onboarding**
   - On first run (when no onboarding profile exists), the app shows a Learning Lens starter setup.
   - User chooses age range + primary use case.
2. **Default starter preset selection**
   - The selected use case maps to a default starter bundle:
     - Study starter
     - Work starter
     - Mixed starter
   - User can edit selected starter lenses immediately before continuing.
3. **Starter lens switching after onboarding**
   - After onboarding, starter-lens chips render at the app shell level for quick switching.
4. **Retrieval-first helper generation from note content**
   - Helpers stay quiet by default and appear only when:
     - active starter lens is Study, or
     - reveal query strongly implies study intent, or
     - note has an explicit study marker (e.g. `#study` or `[study]`).
   - In note read mode (when study actions are eligible), users can run:
     - Explain simply
     - Key ideas
     - Quiz me
     - Flashcards
     - Review next
     - Check my answer (requires user answer first)
5. **Removable generated helpers**
   - Generated helper blocks are labeled as AI support and can be removed/regenerated.
   - Original note body is not overwritten by generated helper output.
6. **Persistence in this pass**
   - `onboardingProfile`, `studySupportBlocks`, and `studyInteractions` persist through scene storage.

## Architecture split

- **Domain model**: `src/learning/studyModel.ts`
  - Onboarding profile, starter lens IDs/presets, study block + interaction types.
- **Orchestration/services**:
  - `src/learning/lensPresets.ts` for default preset mapping + display metadata.
  - `src/learning/studySupportService.ts` for deterministic helper generation.
  - `src/learning/studyState.ts` for note-scoped selectors and state updates.
- **UI integration**:
  - App shell: onboarding/chips decision in `App.tsx` via `scene/learningLensShell.ts`.
  - Note surface: `StudySupportPanel` embedded in `ExpandedNote`.
- **Persistence**:
  - Scene-level persistence + normalization in `sceneStorage`.

## Persistence semantics (explicit)

- Current persistence is **scene-level** (`SceneState` + local scene storage), not a separate user profile service.
- Study helpers are still **note-scoped within scene state** via `blocksByNoteId` / `interactionsByNoteId` shape and selectors.
- Re-running the same helper action replaces the prior block of that interaction type for that note (to avoid block spam), while interaction history is preserved.
- This is acceptable for first pass because it preserves existing storage patterns and keeps changes additive.
- Future move to a dedicated user/note persistence layer should be straightforward because learning domain types/services are isolated.

## Current limitations

- Helper generation is deterministic heuristic logic (not model-backed yet).
- Provenance hooks are minimal (`generatedFrom: 'note-content'`) and intentionally conservative.
- Starter-lens chips are app-shell level and currently gated by profile presence + shell flag.

## Tests in this pass

- Onboarding preset defaults.
- Retrieval-first generation behavior.
- Learning shell mode behavior (onboarding vs chips).
- Note-scoped study state selectors and removal behavior.
