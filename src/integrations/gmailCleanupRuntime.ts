import { GmailCleanupAnalysis } from '../types';

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

async function getTauriInvoke(): Promise<TauriInvoke | null> {
  try {
    const core = await import('@tauri-apps/api/core');
    return core.invoke as TauriInvoke;
  } catch {
    return null;
  }
}

export function isGmailCleanupIntent(rawIntentText: string) {
  return /gmail|unsubscribe|spam|clean up my inbox|cleanup my inbox/i.test(rawIntentText);
}

export async function fetchGmailCleanupAnalysis(rawIntentText: string, accessToken?: string): Promise<GmailCleanupAnalysis> {
  const invoke = await getTauriInvoke();
  if (!invoke) {
    return {
      source: 'fallback',
      scannedMessageCount: 0,
      unsubscribeCandidateCount: 0,
      senderCandidates: [],
      summary: 'Live Gmail analysis is unavailable in this runtime.',
      generatedAt: Date.now(),
      unavailableReason: 'The desktop runtime is not available here.'
    };
  }

  try {
    return await invoke<GmailCleanupAnalysis>('analyze_gmail_cleanup', {
      rawIntentText,
      accessToken: accessToken?.trim() || null
    });
  } catch {
    return {
      source: 'fallback',
      scannedMessageCount: 0,
      unsubscribeCandidateCount: 0,
      senderCandidates: [],
      summary: 'Live Gmail analysis could not be completed.',
      generatedAt: Date.now(),
      unavailableReason: 'The Gmail mailbox could not be reached with the current credentials.'
    };
  }
}
