import { Artifact } from '../../types';

export function createArtifact(input: Omit<Artifact, 'id' | 'generatedAt' | 'version'> & { id?: string; generatedAt?: number; version?: number }): Artifact {
  return {
    id: input.id ?? crypto.randomUUID(),
    generatedAt: input.generatedAt ?? Date.now(),
    version: input.version ?? 1,
    ...input
  };
}
