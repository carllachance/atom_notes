/**
 * Backup and privacy store slice (EPIC-013)
 */
import { useSyncExternalStore } from 'react';
import {
  ExportFormat,
  NoteCardModel,
  PrivacyOptions,
  SchemaVersion,
  SceneState
} from '../types';
import {
  DEFAULT_PRIVACY_OPTIONS,
  exportScene,
  importFromFile,
  importSceneFromJson,
  getSchemaVersion
} from '../scene/dataMigration';
import { now } from '../notes/noteModel';

// Backup state
let _lastExportTime: number = 0;
let _lastImportTime: number = 0;
let _exportCount: number = 0;
let _importCount: number = 0;
let _currentPrivacyOptions: PrivacyOptions = DEFAULT_PRIVACY_OPTIONS;

const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

export type BackupState = {
  lastExportTime: number;
  lastImportTime: number;
  exportCount: number;
  importCount: number;
  currentPrivacyOptions: PrivacyOptions;
  schemaVersion: SchemaVersion;
};

function getSnapshot(): BackupState {
  return {
    lastExportTime: _lastExportTime,
    lastImportTime: _lastImportTime,
    exportCount: _exportCount,
    importCount: _importCount,
    currentPrivacyOptions: _currentPrivacyOptions,
    schemaVersion: getSchemaVersion()
  };
}

function subscribe(callback: () => void) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

/**
 * React hook for backup state
 */
export function useBackupState(): BackupState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Update privacy options for exports (EPIC-013)
 */
export function setPrivacyOptions(options: Partial<PrivacyOptions>): void {
  _currentPrivacyOptions = { ..._currentPrivacyOptions, ...options };
  notifyListeners();
}

/**
 * Get current privacy options (EPIC-013)
 */
export function getPrivacyOptions(): PrivacyOptions {
  return { ..._currentPrivacyOptions };
}

/**
 * Export scene data as a downloadable file (EPIC-013)
 */
export function exportSceneToFile(
  scene: SceneState,
  format: ExportFormat,
  options?: Partial<PrivacyOptions>
): void {
  const mergedOptions = { ..._currentPrivacyOptions, ...options };
  const content = exportScene(scene, format, mergedOptions);

  const mimeTypes: Record<ExportFormat, string> = {
    json: 'application/json',
    markdown: 'text/markdown',
    csv: 'text/csv'
  };

  const extensions: Record<ExportFormat, string> = {
    json: '.json',
    markdown: '.md',
    csv: '.csv'
  };

  const blob = new Blob([content], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `atom-notes-export-${timestamp}${extensions[format]}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  _lastExportTime = now();
  _exportCount++;
  notifyListeners();
}

/**
 * Quick export with default JSON format (EPIC-013)
 */
export function quickExport(scene: Parameters<typeof exportSceneToFile>[0]): void {
  exportSceneToFile(scene, 'json');
}

/**
 * Quick export with full privacy (EPIC-013)
 */
export function exportWithPrivacy(
  scene: Parameters<typeof exportSceneToFile>[0],
  mode: 'full' | 'minimal'
): void {
  const options: Partial<PrivacyOptions> = mode === 'minimal'
    ? {
        includeAttachments: false,
        includeAiTranscript: false,
        includeExternalReferences: false,
        includeProvenance: false,
        redactTimestamps: true,
        redactAiSessionIds: true
      }
    : {
        includeAttachments: true,
        includeAiTranscript: true,
        includeExternalReferences: true,
        includeProvenance: true,
        redactTimestamps: false,
        redactAiSessionIds: false
      };

  exportSceneToFile(scene, 'json', options);
}

/**
 * Import notes from a file (EPIC-010)
 */
export async function importNotesFromFile(
  file: File,
  existingNotes: NoteCardModel[],
  z: number
): Promise<NoteCardModel[]> {
  const newNotes = await importFromFile(file, z);

  // Check for duplicates by title
  const existingTitles = new Set(existingNotes.map((n) => n.title?.toLowerCase()));
  const uniqueNewNotes = newNotes.filter((n) => !existingTitles.has(n.title?.toLowerCase()));

  _lastImportTime = now();
  _importCount++;
  notifyListeners();

  return uniqueNewNotes;
}

/**
 * Import full scene from JSON backup (EPIC-010)
 */
export function importFullSceneFromJson(jsonString: string): {
  notes: NoteCardModel[];
  metadata?: import('../types').BackupMetadata;
} {
  const { scene, metadata } = importSceneFromJson(jsonString);

  _lastImportTime = now();
  _importCount++;
  notifyListeners();

  return { notes: scene.notes, metadata };
}

/**
 * Get backup statistics (EPIC-013)
 */
export function getBackupStats(): {
  exportCount: number;
  importCount: number;
  lastExportTime: number;
  lastImportTime: number;
} {
  return {
    exportCount: _exportCount,
    importCount: _importCount,
    lastExportTime: _lastExportTime,
    lastImportTime: _lastImportTime
  };
}

/**
 * Clear backup statistics
 */
export function clearBackupStats(): void {
  _lastExportTime = 0;
  _lastImportTime = 0;
  _exportCount = 0;
  _importCount = 0;
  notifyListeners();
}

/**
 * Validate file before import (EPIC-010)
 */
export function validateImportFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }

  // Check file type for JSON
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') {
    return { valid: true };
  }

  // Accept common text formats
  const acceptedFormats = ['json', 'md', 'markdown', 'txt', 'text'];
  if (!acceptedFormats.includes(ext || '')) {
    return { valid: false, error: `Unsupported file format: ${ext}. Supported: JSON, Markdown, Plain text.` };
  }

  return { valid: true };
}
