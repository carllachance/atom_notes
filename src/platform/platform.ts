/**
 * Platform detection and configuration (EPIC-011)
 */
import {
  PlatformCapabilities,
  PlatformConfig,
  PlatformType
} from '../types';

// Default capabilities for web platform
const WEB_CAPABILITIES: PlatformCapabilities = {
  fileSystem: false,
  notifications: 'Notification' in window,
  globalShortcuts: false,
  systemTray: false,
  backgroundProcess: false,
  nativeMenus: false,
  pointerType: 'mixed'
};

// Default capabilities for native desktop
const DESKTOP_CAPABILITIES: PlatformCapabilities = {
  fileSystem: true,
  notifications: true,
  globalShortcuts: true,
  systemTray: true,
  backgroundProcess: true,
  nativeMenus: true,
  pointerType: 'mixed'
};

// Detect current platform type
function detectPlatform(): PlatformType {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  // Check for Tauri (native desktop)
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    const platform = (window as unknown as { __TAURI__?: { platform?: string } }).__TAURI__?.platform;
    if (platform) {
      if (platform.includes('darwin')) return 'mac';
      if (platform.includes('win')) return 'windows';
      if (platform.includes('linux')) return 'linux';
    }
    return 'mac'; // Default to mac for Tauri
  }

  // Check for mobile browsers
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';

  // Check for desktop browsers
  if (/Win|Mac|Linux/i.test(userAgent)) {
    if (/Mac/i.test(userAgent)) return 'mac';
    if (/Win/i.test(userAgent)) return 'windows';
    return 'linux';
  }

  return 'web';
}

// Detect if running in native environment
function detectIsNative(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// Detect pointer type
function detectPointerType(): PlatformCapabilities['pointerType'] {
  if (typeof navigator === 'undefined') return 'mouse';

  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const hasPen = (navigator as unknown as { pen?: boolean }).pen !== undefined;

  if (hasPen) return 'pen';
  if (hasTouch && navigator.maxTouchPoints > 1) return 'touch';
  if (hasTouch) return 'mixed';

  return 'mouse';
}

// Get platform capabilities based on platform type
function getCapabilitiesForPlatform(platform: PlatformType, isNative: boolean): PlatformCapabilities {
  if (!isNative) {
    return { ...WEB_CAPABILITIES, pointerType: detectPointerType() };
  }

  const caps = { ...DESKTOP_CAPABILITIES };

  switch (platform) {
    case 'mac':
      caps.systemTray = false; // macOS typically doesn't use tray
      break;
    case 'windows':
      caps.systemTray = true;
      break;
    case 'linux':
      caps.systemTray = true;
      break;
    default:
      break;
  }

  caps.pointerType = detectPointerType();
  return caps;
}

/**
 * Get current platform configuration (EPIC-011)
 */
export function getPlatformConfig(): PlatformConfig {
  const platform = detectPlatform();
  const isNative = detectIsNative();
  const capabilities = getCapabilitiesForPlatform(platform, isNative);

  return {
    platform,
    capabilities,
    isNative,
    version: getAppVersion(),
    arch: getArch()
  };
}

/**
 * Get application version (EPIC-011)
 */
export function getAppVersion(): string {
  // In production, this would be injected at build time
  return '1.0.0';
}

/**
 * Get architecture (EPIC-011)
 */
export function getArch(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  // userAgentData may not be available in all TypeScript configurations
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
  return uaData?.platform;
}

/**
 * Check if platform supports a specific capability (EPIC-011)
 */
export function platformHasCapability(capability: keyof PlatformCapabilities): boolean {
  const config = getPlatformConfig();
  return config.capabilities[capability] as boolean;
}

/**
 * Check if running on macOS (EPIC-011)
 */
export function isMac(): boolean {
  return getPlatformConfig().platform === 'mac';
}

/**
 * Check if running on iOS (EPIC-011)
 */
export function isIOS(): boolean {
  return getPlatformConfig().platform === 'ios';
}

/**
 * Check if running on mobile (EPIC-011)
 */
export function isMobile(): boolean {
  const platform = getPlatformConfig().platform;
  return platform === 'ios' || platform === 'android';
}

/**
 * Check if running on desktop (EPIC-011)
 */
export function isDesktop(): boolean {
  const platform = getPlatformConfig().platform;
  return platform === 'mac' || platform === 'windows' || platform === 'linux';
}

/**
 * Check if running in native environment (EPIC-011)
 */
export function isNative(): boolean {
  return getPlatformConfig().isNative;
}

/**
 * Get platform-specific keyboard shortcut modifier (EPIC-011)
 */
export function getModifierKey(): 'ctrl' | 'meta' {
  return isMac() ? 'meta' : 'ctrl';
}

/**
 * Get platform name for display (EPIC-011)
 */
export function getPlatformDisplayName(): string {
  const config = getPlatformConfig();

  switch (config.platform) {
    case 'mac':
      return 'macOS';
    case 'windows':
      return 'Windows';
    case 'linux':
      return 'Linux';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
    default:
      return 'Web';
  }
}

/**
 * Check if platform supports native file dialogs (EPIC-011)
 */
export function supportsNativeDialogs(): boolean {
  return isNative() && platformHasCapability('fileSystem');
}

/**
 * Get keyboard shortcut display text for current platform (EPIC-011)
 */
export function formatShortcut(shortcut: { mac: string; other: string }): string {
  if (isMac()) {
    return shortcut.mac
      .replace('Cmd', '⌘')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace('Ctrl', '⌃');
  }
  return shortcut.other
    .replace('Ctrl', 'Ctrl')
    .replace('Shift', 'Shift')
    .replace('Alt', 'Alt');
}

/**
 * Platform event listener cleanup
 */
type UnsubscribeFn = () => void;

/**
 * Listen for platform changes (e.g., online/offline) (EPIC-011)
 */
export function onOnlineStatusChange(callback: (isOnline: boolean) => void): UnsubscribeFn {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  return () => {};
}

/**
 * Check if currently online (EPIC-011)
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Get maximum note title length for current platform (EPIC-011)
 */
export function getMaxTitleLength(): number {
  if (isMobile()) return 80;
  return 200;
}

/**
 * Get recommended note card size for current platform (EPIC-011)
 */
export function getRecommendedCardSize(): { width: number; height: number } {
  if (isMobile()) {
    return { width: 280, height: 160 };
  }
  return { width: 320, height: 200 };
}

/**
 * Check if platform prefers dark mode (EPIC-011)
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}
