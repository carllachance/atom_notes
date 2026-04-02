export type MailboxAuthState = {
  gmailAccessToken: string;
  outlookAccessToken: string;
};

const MAILBOX_AUTH_KEY = 'atom-notes.mailbox-auth.v1';

function emptyState(): MailboxAuthState {
  return {
    gmailAccessToken: '',
    outlookAccessToken: ''
  };
}

export function loadMailboxAuthState(): MailboxAuthState {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(MAILBOX_AUTH_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<MailboxAuthState>;
    return {
      gmailAccessToken: typeof parsed.gmailAccessToken === 'string' ? parsed.gmailAccessToken : '',
      outlookAccessToken: typeof parsed.outlookAccessToken === 'string' ? parsed.outlookAccessToken : ''
    };
  } catch {
    return emptyState();
  }
}

export function saveMailboxAuthState(next: Partial<MailboxAuthState>) {
  if (typeof window === 'undefined') return;
  const current = loadMailboxAuthState();
  const merged: MailboxAuthState = {
    gmailAccessToken: typeof next.gmailAccessToken === 'string' ? next.gmailAccessToken : current.gmailAccessToken,
    outlookAccessToken: typeof next.outlookAccessToken === 'string' ? next.outlookAccessToken : current.outlookAccessToken
  };
  window.localStorage.setItem(MAILBOX_AUTH_KEY, JSON.stringify(merged));
}

export function clearMailboxAuthValue(provider: 'gmail' | 'outlook') {
  saveMailboxAuthState(provider === 'gmail' ? { gmailAccessToken: '' } : { outlookAccessToken: '' });
}
