/**
 * Data import/export utilities for schema migration and privacy-respecting backup (EPIC-010, EPIC-013)
 */
import {
  BackupMetadata,
  ExportFormat,
  NoteCardModel,
  PrivacyOptions,
  Project,
  Relationship,
  SchemaVersion,
  SceneState,
  Workspace
} from '../types';
import { normalizeNote, now } from '../notes/noteModel';
import { normalizeProject } from '../projects/projectModel';
import { normalizeWorkspace } from '../workspaces/workspaceModel';
import { normalizeRelationship } from './sceneStorage';

const CURRENT_SCHEMA_VERSION: SchemaVersion = {
  major: 1,
  minor: 0,
  patch: 0,
  label: 'initial'
};

/**
 * Get current schema version (EPIC-010)
 */
export function getSchemaVersion(): SchemaVersion {
  return { ...CURRENT_SCHEMA_VERSION };
}

/**
 * Compare schema versions (EPIC-010)
 */
export function isSchemaCompatible(target: SchemaVersion): boolean {
  return target.major === CURRENT_SCHEMA_VERSION.major;
}

/**
 * Default privacy options (EPIC-013)
 */
export const DEFAULT_PRIVACY_OPTIONS: PrivacyOptions = {
  includeAttachments: true,
  includeAiTranscript: false,
  includeExternalReferences: true,
  includeProvenance: true,
  redactTimestamps: false,
  redactAiSessionIds: true
};

/**
 * Full privacy options (EPIC-013)
 */
export const FULL_PRIVACY_OPTIONS: PrivacyOptions = {
  includeAttachments: false,
  includeAiTranscript: false,
  includeExternalReferences: false,
  includeProvenance: false,
  redactTimestamps: true,
  redactAiSessionIds: true
};

/**
 * Apply privacy options to scene export (EPIC-013)
 */
function applyPrivacyOptions<T extends Partial<SceneState>>(
  scene: T,
  options: PrivacyOptions
): T {
  const result = { ...scene };

  // Filter notes based on privacy options
  if (Array.isArray(result.notes)) {
    result.notes = result.notes.map((note) => {
      const filtered = { ...note };

      // Remove attachments if not included
      if (!options.includeAttachments) {
        filtered.attachments = [];
      }

      // Remove provenance if not included
      if (!options.includeProvenance && filtered.provenance) {
        filtered.provenance = {
          ...filtered.provenance,
          externalReferences: [],
          aiSessionId: undefined,
          contentHash: undefined
        };
      }

      // Redact timestamps if requested
      if (options.redactTimestamps) {
        filtered.createdAt = 0;
        filtered.updatedAt = 0;
        if (filtered.provenance) {
          filtered.provenance = {
            ...filtered.provenance,
            createdAt: 0,
            updatedAt: 0
          };
        }
      }

      // Redact AI session IDs if requested
      if (options.redactAiSessionIds && filtered.provenance) {
        filtered.provenance = {
          ...filtered.provenance,
          aiSessionId: undefined
        };
      }

      return filtered;
    });
  }

  // Filter AI panel transcript if not included
  if (!options.includeAiTranscript && result.aiPanel) {
    result.aiPanel = {
      ...result.aiPanel,
      transcript: [],
      response: null
    };
  }

  return result;
}

/**
 * Export scene to JSON with metadata (EPIC-013)
 */
export function exportSceneToJson(
  scene: SceneState,
  options: PrivacyOptions = DEFAULT_PRIVACY_OPTIONS
): string {
  const filtered = applyPrivacyOptions(scene, options);

  const metadata: BackupMetadata = {
    version: '1.0.0',
    exportedAt: now(),
    schemaVersion: CURRENT_SCHEMA_VERSION.major,
    includesAttachments: options.includeAttachments,
    includesAiTranscript: options.includeAiTranscript,
    includesExternalReferences: options.includeExternalReferences,
    privacyMode: options.redactTimestamps ? 'redacted' : 'full'
  };

  return JSON.stringify({
    metadata,
    scene: filtered
  }, null, 2);
}

/**
 * Export scene to Markdown (EPIC-013)
 */
export function exportSceneToMarkdown(
  scene: SceneState,
  options: PrivacyOptions = DEFAULT_PRIVACY_OPTIONS
): string {
  const lines: string[] = [];

  // Header
  lines.push('# Atom Notes Export');
  if (!options.redactTimestamps) {
    lines.push(`\n*Exported: ${new Date(now()).toISOString()}*\n`);
  }
  lines.push('---\n');

  // Projects
  if (scene.projects.length > 0) {
    lines.push('## Projects\n');
    for (const project of scene.projects) {
      lines.push(`- **${project.name}** (${project.key})`);
    }
    lines.push('');
  }

  // Workspaces
  if (scene.workspaces.length > 0) {
    lines.push('## Workspaces\n');
    for (const workspace of scene.workspaces) {
      lines.push(`- **${workspace.name}** (${workspace.key})`);
    }
    lines.push('');
  }

  // Notes
  lines.push('## Notes\n');
  for (const note of scene.notes) {
    if (note.deleted) continue;

    // Note header
    const title = note.title || 'Untitled';
    lines.push(`### ${title}\n`);

    // Metadata
    if (!options.redactTimestamps) {
      lines.push(`- Created: ${new Date(note.createdAt).toISOString()}`);
      lines.push(`- Updated: ${new Date(note.updatedAt).toISOString()}`);
    }
    if (note.projectIds.length > 0) {
      const projectNames = note.projectIds
        .map((id) => scene.projects.find((p) => p.id === id)?.name || id)
        .join(', ');
      lines.push(`- Projects: ${projectNames}`);
    }

    // Content
    lines.push('\n```\n' + note.body + '\n```\n');

    // External references from provenance
    if (options.includeExternalReferences && note.provenance?.externalReferences) {
      const refs = note.provenance.externalReferences.filter((ref) => ref.kind === 'url');
      if (refs.length > 0) {
        lines.push('\n**References:**\n');
        for (const ref of refs) {
          lines.push(`- [${ref.label}](${ref.value})`);
        }
      }
    }

    lines.push('---\n');
  }

  return lines.join('\n');
}

/**
 * Export scene to CSV (EPIC-013)
 */
export function exportSceneToCsv(
  scene: SceneState,
  options: PrivacyOptions = DEFAULT_PRIVACY_OPTIONS
): string {
  const rows: string[] = [];

  // Header row
  const headers = ['id', 'title', 'body', 'createdAt', 'updatedAt', 'projectIds', 'workspaceId', 'archived', 'deleted'];
  if (options.includeProvenance) {
    headers.push('provenance_origin', 'hasExternalReferences');
  }
  rows.push(headers.join(','));

  // Data rows
  for (const note of scene.notes) {
    if (note.deleted) continue;

    const row = [
      escapeCsv(note.id),
      escapeCsv(note.title || ''),
      escapeCsv(note.body),
      options.redactTimestamps ? '' : note.createdAt.toString(),
      options.redactTimestamps ? '' : note.updatedAt.toString(),
      escapeCsv(note.projectIds.join(';')),
      escapeCsv(note.workspaceId || ''),
      note.archived ? 'true' : 'false',
      'false'
    ];

    if (options.includeProvenance) {
      row.push(
        escapeCsv(note.provenance?.origin || 'manual'),
        note.provenance?.externalReferences?.length ? 'true' : 'false'
      );
    }

    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Export scene with specified format (EPIC-013)
 */
export function exportScene(
  scene: SceneState,
  format: ExportFormat,
  options: PrivacyOptions = DEFAULT_PRIVACY_OPTIONS
): string {
  switch (format) {
    case 'json':
      return exportSceneToJson(scene, options);
    case 'markdown':
      return exportSceneToMarkdown(scene, options);
    case 'csv':
      return exportSceneToCsv(scene, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Import scene from JSON (EPIC-010)
 */
export function importSceneFromJson(
  jsonString: string
): { scene: SceneState; metadata?: BackupMetadata } {
  const parsed = JSON.parse(jsonString) as {
    metadata?: BackupMetadata;
    scene: Partial<SceneState>;
  };

  const metadata = parsed.metadata;
  const sceneData = parsed.scene;

  // Validate schema version if metadata exists
  if (metadata && !isSchemaCompatible({ major: metadata.schemaVersion, minor: 0, patch: 0 })) {
    console.warn(`Schema version mismatch: expected ${CURRENT_SCHEMA_VERSION.major}, got ${metadata.schemaVersion}`);
  }

  // Normalize notes
  const normalizedNotes: NoteCardModel[] = Array.isArray(sceneData.notes)
    ? sceneData.notes.map((note, i) => normalizeNote(note, i))
    : [];

  // Normalize projects
  const normalizedProjects: Project[] = Array.isArray(sceneData.projects)
    ? sceneData.projects.map((p, i) => normalizeProject(p, i)).filter(Boolean) as Project[]
    : [];

  // Normalize workspaces
  const normalizedWorkspaces: Workspace[] = Array.isArray(sceneData.workspaces)
    ? sceneData.workspaces.map((w, i) => normalizeWorkspace(w, i)).filter(Boolean) as Workspace[]
    : [];

  // Normalize relationships
  const normalizedRelationships: Relationship[] = Array.isArray(sceneData.relationships)
    ? sceneData.relationships.map((r) => normalizeRelationship(r)).filter(Boolean) as Relationship[]
    : [];

  const scene: SceneState = {
    notes: normalizedNotes,
    relationships: normalizedRelationships,
    projects: normalizedProjects,
    workspaces: normalizedWorkspaces,
    insightTimeline: sceneData.insightTimeline || [],
    isDragging: false,
    activeNoteId: null,
    expandedSecondarySurface: sceneData.expandedSecondarySurface || 'none',
    captureComposer: sceneData.captureComposer || { draft: '', lastCreatedNoteId: null },
    focusMode: sceneData.focusMode || { highlight: true, isolate: false },
    aiPanel: sceneData.aiPanel || {
      mode: 'ask',
      query: '',
      response: null,
      transcript: [],
      loading: false,
      communicationState: 'idle',
      interactionMode: 'live-stream'
    },
    lastCtrlTapTs: 0,
    lens: sceneData.lens || { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };

  return { scene, metadata };
}

/**
 * Generate import filename (EPIC-010)
 */
export function generateImportFilename(file: File): string {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return `${baseName}-imported-${Date.now()}`;
}

/**
 * Supported import formats (EPIC-010)
 */
export type ImportFormat = 'json' | 'markdown' | 'plaintext';

/**
 * Detect import format from file (EPIC-010)
 */
export function detectImportFormat(file: File): ImportFormat {
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

/**
 * Import notes from markdown text (EPIC-010)
 */
export function importNotesFromMarkdown(
  markdown: string,
  z: number = 1
): NoteCardModel[] {
  const notes: NoteCardModel[] = [];
  const lines = markdown.split('\n');

  let currentTitle = '';
  let currentBody: string[] = [];
  let noteIndex = z;

  for (const line of lines) {
    // Check for note header (## or ###)
    if (line.startsWith('## ') || line.startsWith('### ')) {
      // Save previous note if exists
      if (currentTitle || currentBody.length > 0) {
        notes.push(normalizeNote({
          title: currentTitle || null,
          body: currentBody.join('\n').trim(),
          z: noteIndex++
        }, notes.length));
      }
      currentTitle = line.replace(/^#{2,3}\s*/, '');
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  // Don't forget the last note
  if (currentTitle || currentBody.length > 0) {
    notes.push(normalizeNote({
      title: currentTitle || null,
      body: currentBody.join('\n').trim(),
      z: noteIndex
    }, notes.length));
  }

  return notes;
}

/**
 * Import notes from plain text (EPIC-010)
 */
export function importNotesFromPlainText(
  text: string,
  z: number = 1
): NoteCardModel[] {
  // Split by double newlines to separate notes
  const blocks = text.split(/\n\n+/).filter((block) => block.trim());

  return blocks.map((block, index) => {
    const lines = block.split('\n');
    const title = lines[0]?.trim() || null;
    const body = lines.slice(1).join('\n').trim();

    return normalizeNote({
      title,
      body,
      z: z + index
    }, index);
  });
}

/**
 * Import from any supported format (EPIC-010)
 */
export async function importFromFile(
  file: File,
  z: number = 1
): Promise<NoteCardModel[]> {
  const format = detectImportFormat(file);
  const content = await file.text();

  switch (format) {
    case 'json': {
      const { scene } = importSceneFromJson(content);
      return scene.notes;
    }
    case 'markdown':
      return importNotesFromMarkdown(content, z);
    case 'plaintext':
      return importNotesFromPlainText(content, z);
    default:
      return [];
  }
}
