import { NoteCardModel } from '../../../types';
import { ButlerTool } from '../butlerToolRegistry';

export type VerifyArtifactFreshnessInput = {
  artifactNote: NoteCardModel | null;
  asOf: number;
  maxAgeHours?: number;
};

export type VerifyArtifactFreshnessOutput = {
  isFresh: boolean;
  ageHours: number | null;
  summary: string;
};

export const verifyArtifactFreshnessTool: ButlerTool<VerifyArtifactFreshnessInput, VerifyArtifactFreshnessOutput> = {
  id: 'verify_artifact_freshness',
  label: 'Verify Artifact Freshness',
  run(input) {
    if (!input.artifactNote) {
      return { isFresh: false, ageHours: null, summary: 'No dashboard artifact was found.' };
    }
    const ageHours = Math.max(0, (input.asOf - input.artifactNote.updatedAt) / (1000 * 60 * 60));
    const maxAgeHours = input.maxAgeHours ?? 48;
    return {
      isFresh: ageHours <= maxAgeHours,
      ageHours,
      summary: ageHours <= maxAgeHours
        ? `Artifact looks current at ${ageHours.toFixed(1)} hours old.`
        : `Artifact may be stale at ${ageHours.toFixed(1)} hours old.`
    };
  }
};
