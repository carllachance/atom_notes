import { OnboardingProfile, StudyInteraction, StudySupportBlock } from './studyModel';

export type StudyPersistenceSnapshot = {
  onboardingProfile: OnboardingProfile | null;
  blocksByNoteId: Record<string, StudySupportBlock[]>;
  interactionsByNoteId: Record<string, StudyInteraction[]>;
};

export type StudyPersistenceBackend = {
  load(userId: string): StudyPersistenceSnapshot | null;
  save(userId: string, snapshot: StudyPersistenceSnapshot): void;
};

const STUDY_PERSISTENCE_KEY = 'atom-notes.study-artifacts.v1';

class LocalStorageStudyPersistenceBackend implements StudyPersistenceBackend {
  load(userId: string): StudyPersistenceSnapshot | null {
    try {
      const raw = localStorage.getItem(STUDY_PERSISTENCE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, StudyPersistenceSnapshot>;
      return parsed[userId] ?? null;
    } catch {
      return null;
    }
  }

  save(userId: string, snapshot: StudyPersistenceSnapshot): void {
    try {
      const raw = localStorage.getItem(STUDY_PERSISTENCE_KEY);
      const parsed = raw ? JSON.parse(raw) as Record<string, StudyPersistenceSnapshot> : {};
      parsed[userId] = snapshot;
      localStorage.setItem(STUDY_PERSISTENCE_KEY, JSON.stringify(parsed));
    } catch {
      // durability fallback intentionally quiet; scene persistence still captures the same domain.
    }
  }
}

const activeBackend: StudyPersistenceBackend = new LocalStorageStudyPersistenceBackend();

export function loadStudyPersistence(userId: string): StudyPersistenceSnapshot | null {
  return activeBackend.load(userId);
}

export function saveStudyPersistence(userId: string, snapshot: StudyPersistenceSnapshot): void {
  activeBackend.save(userId, snapshot);
}

export { STUDY_PERSISTENCE_KEY };
