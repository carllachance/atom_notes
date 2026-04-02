import { OutlookUnreadAnalysis } from '../types';

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

async function getTauriInvoke(): Promise<TauriInvoke | null> {
  try {
    const core = await import('@tauri-apps/api/core');
    return core.invoke as TauriInvoke;
  } catch {
    return null;
  }
}

export function isOutlookUnreadIntent(rawIntentText: string) {
  return /outlook|microsoft email|check my .*email|unread|missing anything/i.test(rawIntentText);
}

export async function fetchOutlookUnreadAnalysis(rawIntentText: string, accessToken?: string): Promise<OutlookUnreadAnalysis> {
  const invoke = await getTauriInvoke();
  if (!invoke) {
    return {
      source: 'fallback',
      unreadCount: 0,
      urgentCount: 0,
      messages: [],
      summary: 'Live Outlook analysis is unavailable in this runtime.',
      generatedAt: Date.now(),
      unavailableReason: 'The desktop runtime is not available here.'
    };
  }

  try {
    return await invoke<OutlookUnreadAnalysis>('analyze_outlook_unread', {
      rawIntentText,
      accessToken: accessToken?.trim() || null
    });
  } catch {
    return {
      source: 'fallback',
      unreadCount: 0,
      urgentCount: 0,
      messages: [],
      summary: 'Live Outlook analysis could not be completed.',
      generatedAt: Date.now(),
      unavailableReason: 'The Outlook mailbox could not be reached with the current credentials.'
    };
  }
}
