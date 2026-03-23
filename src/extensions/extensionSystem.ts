/**
 * Extension system with trust guardrails (EPIC-012)
 */
import { useSyncExternalStore } from 'react';
import {
  ExtensionContext,
  ExtensionError,
  ExtensionEvent,
  ExtensionManifest,
  ExtensionPermission,
  ExtensionTrustLevel,
  LensExtension
} from '../types';
import { getPlatformConfig } from '../platform/platform';
import { now } from '../notes/noteModel';

const EXTENSIONS_STORAGE_KEY = 'atom-notes.extensions.v1';
const APP_MIN_VERSION = '1.0.0';

// Trust level hierarchy (higher index = more trusted)
const TRUST_HIERARCHY: ExtensionTrustLevel[] = ['sandboxed', 'untrusted', 'trusted', 'system'];

/**
 * Extension state
 */
let _extensions: Map<string, ExtensionManifest> = new Map();
let _extensionErrors: ExtensionError[] = [];
let _extensionEvents: ExtensionEvent[] = [];
let _activeLenses: LensExtension[] = [];

const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

// Load extensions from storage
function loadExtensions(): void {
  try {
    const raw = localStorage.getItem(EXTENSIONS_STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw) as ExtensionManifest[];
    _extensions = new Map(data.map((ext) => [ext.id, ext]));
  } catch {
    _extensions = new Map();
  }
}

// Save extensions to storage
function saveExtensions(): void {
  const data = Array.from(_extensions.values());
  localStorage.setItem(EXTENSIONS_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Subscribe to extension state changes
 */
function subscribe(callback: () => void) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function getSnapshot() {
  return {
    extensions: Array.from(_extensions.values()),
    errors: _extensionErrors,
    events: _extensionEvents,
    activeLenses: _activeLenses
  };
}

/**
 * React hook for extension state
 */
export function useExtensions(): ExtensionManifest[] {
  const { extensions } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return extensions;
}

/**
 * React hook for extension errors
 */
export function useExtensionErrors(): ExtensionError[] {
  const { errors } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return errors;
}

/**
 * React hook for active extension lenses
 */
export function useExtensionLenses(): LensExtension[] {
  const { activeLenses } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return activeLenses;
}

/**
 * Check version compatibility (EPIC-012)
 */
function isVersionCompatible(minVersion: string, currentVersion: string = APP_MIN_VERSION): boolean {
  const minParts = minVersion.split('.').map(Number);
  const currentParts = currentVersion.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const min = minParts[i] || 0;
    const current = currentParts[i] || 0;

    if (current > min) return true;
    if (current < min) return false;
  }

  return true;
}

/**
 * Check if extension has required permissions (EPIC-012)
 */
function hasRequiredPermissions(manifest: ExtensionManifest, required: ExtensionPermission[]): boolean {
  return required.every((perm) => manifest.permissions.includes(perm));
}

/**
 * Get trust level weight for comparison (EPIC-012)
 */
function getTrustLevelWeight(level: ExtensionTrustLevel): number {
  return TRUST_HIERARCHY.indexOf(level);
}

/**
 * Check if a permission can be granted based on trust level (EPIC-012)
 */
function canGrantPermission(extension: ExtensionManifest, permission: ExtensionPermission): boolean {
  // System extensions can do anything
  if (extension.trustLevel === 'system') return true;

  // Sandboxed extensions have very limited permissions
  if (extension.trustLevel === 'sandboxed') {
    const allowed: ExtensionPermission[] = ['custom_lens', 'read_notes'];
    return allowed.includes(permission);
  }

  // Untrusted extensions need explicit user consent for most permissions
  if (extension.trustLevel === 'untrusted') {
    const allowed: ExtensionPermission[] = ['read_notes', 'custom_lens'];
    return allowed.includes(permission);
  }

  // Trusted extensions can do most things except system-level operations
  const restricted: ExtensionPermission[] = [];
  return !restricted.includes(permission);
}

/**
 * Create extension context for runtime (EPIC-012)
 */
export function createExtensionContext(manifest: ExtensionManifest): ExtensionContext {
  const platform = getPlatformConfig();

  return {
    manifest,
    platform,
    capabilities: {
      canReadNotes: manifest.permissions.includes('read_notes'),
      canWriteNotes: manifest.permissions.includes('write_notes'),
      canAccessAI: manifest.permissions.includes('access_ai'),
      canImportFiles: manifest.permissions.includes('import_files'),
      canExportData: manifest.permissions.includes('export_data')
    }
  };
}

/**
 * Install an extension (EPIC-012)
 */
export function installExtension(manifest: ExtensionManifest): { success: boolean; error?: string } {
  // Validate version
  if (!isVersionCompatible(manifest.minAppVersion)) {
    const error: ExtensionError = {
      code: 'INCOMPATIBLE_VERSION',
      message: `Extension requires app version ${manifest.minAppVersion}, current is ${APP_MIN_VERSION}`,
      extensionId: manifest.id,
      timestamp: now()
    };
    _extensionErrors.push(error);
    notifyListeners();
    return { success: false, error: error.message };
  }

  // Check for duplicate
  if (_extensions.has(manifest.id)) {
    return { success: false, error: 'Extension already installed' };
  }

  // Install
  _extensions.set(manifest.id, { ...manifest, installedAt: now() });
  saveExtensions();

  // Emit event
  const event: ExtensionEvent = { type: 'enabled', extensionId: manifest.id };
  _extensionEvents.push(event);
  notifyListeners();

  return { success: true };
}

/**
 * Uninstall an extension (EPIC-012)
 */
export function uninstallExtension(extensionId: string): void {
  _extensions.delete(extensionId);
  _activeLenses = _activeLenses.filter((lens) => !lens.id.startsWith(extensionId));
  saveExtensions();
  notifyListeners();
}

/**
 * Enable an extension (EPIC-012)
 */
export function enableExtension(extensionId: string): { success: boolean; error?: string } {
  const extension = _extensions.get(extensionId);
  if (!extension) {
    return { success: false, error: 'Extension not found' };
  }

  if (extension.enabled) {
    return { success: true }; // Already enabled
  }

  _extensions.set(extensionId, { ...extension, enabled: true });
  saveExtensions();

  const event: ExtensionEvent = { type: 'enabled', extensionId };
  _extensionEvents.push(event);
  notifyListeners();

  return { success: true };
}

/**
 * Disable an extension (EPIC-012)
 */
export function disableExtension(extensionId: string): void {
  const extension = _extensions.get(extensionId);
  if (!extension) return;

  _extensions.set(extensionId, { ...extension, enabled: false });
  _activeLenses = _activeLenses.filter((lens) => !lens.id.startsWith(extensionId));
  saveExtensions();

  const event: ExtensionEvent = { type: 'disabled', extensionId };
  _extensionEvents.push(event);
  notifyListeners();
}

/**
 * Grant a permission to an extension (EPIC-012)
 */
export function grantPermission(
  extensionId: string,
  permission: ExtensionPermission
): { success: boolean; error?: string } {
  const extension = _extensions.get(extensionId);
  if (!extension) {
    return { success: false, error: 'Extension not found' };
  }

  if (!canGrantPermission(extension, permission)) {
    return {
      success: false,
      error: `Permission ${permission} cannot be granted to ${extension.trustLevel} extension`
    };
  }

  if (extension.permissions.includes(permission)) {
    return { success: true }; // Already granted
  }

  _extensions.set(extensionId, {
    ...extension,
    permissions: [...extension.permissions, permission]
  });
  saveExtensions();

  const event: ExtensionEvent = { type: 'permission_granted', extensionId, permission };
  _extensionEvents.push(event);
  notifyListeners();

  return { success: true };
}

/**
 * Revoke a permission from an extension (EPIC-012)
 */
export function revokePermission(extensionId: string, permission: ExtensionPermission): void {
  const extension = _extensions.get(extensionId);
  if (!extension) return;

  // System extensions can't have permissions revoked (except by system)
  if (extension.trustLevel === 'system') return;

  _extensions.set(extensionId, {
    ...extension,
    permissions: extension.permissions.filter((p) => p !== permission)
  });
  saveExtensions();

  const event: ExtensionEvent = { type: 'permission_revoked', extensionId, permission };
  _extensionEvents.push(event);
  notifyListeners();
}

/**
 * Activate an extension lens (EPIC-012)
 */
export function activateExtensionLens(extensionId: string, lens: LensExtension): void {
  const extension = _extensions.get(extensionId);
  if (!extension || !extension.enabled) return;

  // Check if extension has custom_lens permission
  if (!extension.permissions.includes('custom_lens')) {
    const error: ExtensionError = {
      code: 'MISSING_PERMISSION',
      message: 'Extension lacks custom_lens permission',
      extensionId,
      timestamp: now()
    };
    _extensionErrors.push(error);
    notifyListeners();
    return;
  }

  // Add lens with extension prefix
  const prefixedLens: LensExtension = {
    ...lens,
    id: `${extensionId}:${lens.id}`
  };

  _activeLenses.push(prefixedLens);
  notifyListeners();

  const event: ExtensionEvent = { type: 'lens_activated', extensionId, lensId: prefixedLens.id };
  _extensionEvents.push(event);
}

/**
 * Deactivate an extension lens (EPIC-012)
 */
export function deactivateExtensionLens(lensId: string): void {
  _activeLenses = _activeLenses.filter((lens) => lens.id !== lensId);
  notifyListeners();
}

/**
 * Get extension by ID (EPIC-012)
 */
export function getExtension(extensionId: string): ExtensionManifest | undefined {
  return _extensions.get(extensionId);
}

/**
 * Get all enabled extensions (EPIC-012)
 */
export function getEnabledExtensions(): ExtensionManifest[] {
  return Array.from(_extensions.values()).filter((ext) => ext.enabled);
}

/**
 * Get all extension errors (EPIC-012)
 */
export function getExtensionErrors(): ExtensionError[] {
  return [..._extensionErrors];
}

/**
 * Clear extension errors (EPIC-012)
 */
export function clearExtensionErrors(): void {
  _extensionErrors = [];
  notifyListeners();
}

/**
 * Check if extension is trusted more than another (EPIC-012)
 */
export function isMoreTrusted(a: ExtensionManifest, b: ExtensionManifest): boolean {
  return getTrustLevelWeight(a.trustLevel) > getTrustLevelWeight(b.trustLevel);
}

/**
 * Get maximum permissions based on trust level (EPIC-012)
 */
export function getMaxPermissionsForTrustLevel(trustLevel: ExtensionTrustLevel): ExtensionPermission[] {
  switch (trustLevel) {
    case 'system':
      return [
        'read_notes', 'write_notes', 'read_relationships', 'write_relationships',
        'access_ai', 'import_files', 'export_data', 'network_access', 'custom_lens'
      ];
    case 'trusted':
      return [
        'read_notes', 'write_notes', 'read_relationships', 'write_relationships',
        'access_ai', 'import_files', 'export_data', 'custom_lens'
      ];
    case 'untrusted':
      return ['read_notes', 'custom_lens'];
    case 'sandboxed':
      return ['read_notes', 'custom_lens'];
    default:
      return [];
  }
}

/**
 * Validate extension manifest structure (EPIC-012)
 */
export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }

  const m = manifest as Record<string, unknown>;

  // Required fields
  if (typeof m.id !== 'string' || !m.id) errors.push('Missing or invalid id');
  if (typeof m.name !== 'string' || !m.name) errors.push('Missing or invalid name');
  if (typeof m.version !== 'string' || !m.version) errors.push('Missing or invalid version');
  if (typeof m.author !== 'string' || !m.author) errors.push('Missing or invalid author');

  // Permissions must be array
  if (!Array.isArray(m.permissions)) errors.push('Permissions must be an array');

  // Trust level must be valid
  const validTrustLevels: ExtensionTrustLevel[] = ['system', 'trusted', 'untrusted', 'sandboxed'];
  if (!validTrustLevels.includes(m.trustLevel as ExtensionTrustLevel)) {
    errors.push('Invalid trust level');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Initialize extension system (EPIC-012)
 */
export function initializeExtensions(): void {
  loadExtensions();
}

// Auto-initialize on module load
initializeExtensions();
