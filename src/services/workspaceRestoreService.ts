import { WorkspaceState } from '../models/workspace';
import { persistenceService } from './persistenceService';

export const workspaceRestoreService = {
  snapshot(state: WorkspaceState) {
    persistenceService.saveWorkspace(state);
  },
  restore(initial: WorkspaceState): WorkspaceState {
    return persistenceService.loadWorkspace() ?? initial;
  },
};
