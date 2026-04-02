import { useEffect, useMemo, useState } from 'react';
import { Artifact, ButlerItem, ExecutionLog, MemoryPreference, WorkflowPlan } from '../../types';
import { clearMailboxAuthValue, loadMailboxAuthState, saveMailboxAuthState } from '../../integrations/mailboxAuthStorage';
import { sortButlerItems } from '../services/legacySort';
import { getArtifactsForItem, getLogsForItem, getPlanForItem } from '../mappers/butlerViewModelMappers';
import { ButlerEmptyState } from './ButlerEmptyState';
import { ButlerItemDetail } from './ButlerItemDetail';
import { ButlerQueueList } from './ButlerQueueList';

type ButlerQueueScreenProps = {
  items: ButlerItem[];
  workflowPlans: WorkflowPlan[];
  artifacts: Artifact[];
  executionLogs: ExecutionLog[];
  memoryPreferences: MemoryPreference[];
  onOpenSourceNote?: (noteId: string) => void;
  onCreateRequest?: (rawIntentText: string) => void | Promise<void>;
  onSubmitClarification?: (itemId: string, answers: Record<string, string>) => void | Promise<void>;
};

export function ButlerQueueScreen({
  items,
  workflowPlans,
  artifacts,
  executionLogs,
  memoryPreferences,
  onOpenSourceNote,
  onCreateRequest,
  onSubmitClarification
}: ButlerQueueScreenProps) {
  const [draft, setDraft] = useState('');
  const [gmailAccessToken, setGmailAccessToken] = useState(() => loadMailboxAuthState().gmailAccessToken);
  const [outlookAccessToken, setOutlookAccessToken] = useState(() => loadMailboxAuthState().outlookAccessToken);
  const sortedItems = useMemo(() => sortButlerItems(items), [items]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(sortedItems[0]?.id ?? null);

  useEffect(() => {
    if (!sortedItems.length) {
      setSelectedItemId(null);
      return;
    }
    if (!selectedItemId || !sortedItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(sortedItems[0].id);
    }
  }, [selectedItemId, sortedItems]);

  const selectedItem = sortedItems.find((item) => item.id === selectedItemId) ?? null;
  const selectedPlan = selectedItem ? getPlanForItem(selectedItem, workflowPlans) : null;
  const selectedArtifacts = selectedItem ? getArtifactsForItem(selectedItem, artifacts) : [];
  const selectedLogs = selectedItem ? getLogsForItem(selectedItem, executionLogs) : [];
  const reviewCount = sortedItems.filter((item) => item.status === 'awaiting_review').length;

  return (
    <section className="butler-queue" aria-label="Butler Queue">
      <div className="butler-queue__header">
        <div>
          <strong>Butler Queue</strong>
          <p>Outcome-first delegation with visible plans, reversible prep, and review checkpoints.</p>
        </div>
        <div className="butler-queue__summary">
          <span>{sortedItems.length} items</span>
          <span>{reviewCount} ready</span>
        </div>
      </div>

      <form
        className="butler-intake"
        onSubmit={(event) => {
          event.preventDefault();
          const next = draft.trim();
          if (!next || !onCreateRequest) return;
          onCreateRequest(next);
          setDraft('');
        }}
      >
        <input
          aria-label="Create Butler request"
          placeholder="Write an email about the vendor delay"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="ribbon-button" disabled={!draft.trim() || !onCreateRequest}>Delegate</button>
      </form>

      <section className="butler-mailbox-access" aria-label="Mailbox access">
        <div className="butler-detail__section-head">
          <strong>Mailbox Access</strong>
          <span>{gmailAccessToken ? 'Gmail ready' : 'Gmail needed'} · {outlookAccessToken ? 'Outlook ready' : 'Outlook needed'}</span>
        </div>
        <div className="butler-mailbox-access__grid">
          <section className="butler-mailbox-provider">
            <label className="butler-clarify-form__question">
              <span>Gmail access token</span>
              <small>Fill this in once and Butler can use live Gmail data for cleanup requests on this device.</small>
              <input
                type="password"
                value={gmailAccessToken}
                placeholder="Paste Gmail access token"
                onChange={(event) => setGmailAccessToken(event.target.value)}
              />
              <div className="butler-mailbox-access__actions">
                <button
                  type="button"
                  onClick={() => saveMailboxAuthState({ gmailAccessToken })}
                  disabled={!gmailAccessToken.trim()}
                >
                  Save Gmail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearMailboxAuthValue('gmail');
                    setGmailAccessToken('');
                  }}
                >
                  Clear
                </button>
              </div>
            </label>

            <div className="butler-mailbox-help">
              <strong>How to get a Gmail token</strong>
              <ol>
                <li>Open <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noreferrer">Google OAuth Playground</a>.</li>
                <li>Open the settings gear and enable <code>Use your own OAuth credentials</code> if you have them. For quick MVP testing, the default playground credentials may also work.</li>
                <li>In Step 1, add this scope: <code>https://www.googleapis.com/auth/gmail.readonly</code></li>
                <li>Click <code>Authorize APIs</code>, sign in, and approve read-only Gmail access.</li>
                <li>Click <code>Exchange authorization code for tokens</code>.</li>
                <li>Paste the <code>Access token</code> here and click <code>Save Gmail</code>.</li>
              </ol>
              <p>This MVP uses a temporary access token, so it may expire and need to be pasted again later.</p>
            </div>
          </section>

          <section className="butler-mailbox-provider">
            <label className="butler-clarify-form__question">
              <span>Outlook access token</span>
              <small>Fill this in once and Butler can use live Outlook unread-mail summaries on this device.</small>
              <input
                type="password"
                value={outlookAccessToken}
                placeholder="Paste Outlook access token"
                onChange={(event) => setOutlookAccessToken(event.target.value)}
              />
              <div className="butler-mailbox-access__actions">
                <button
                  type="button"
                  onClick={() => saveMailboxAuthState({ outlookAccessToken })}
                  disabled={!outlookAccessToken.trim()}
                >
                  Save Outlook
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearMailboxAuthValue('outlook');
                    setOutlookAccessToken('');
                  }}
                >
                  Clear
                </button>
              </div>
            </label>

            <div className="butler-mailbox-help">
              <strong>How to get an Outlook token</strong>
              <ol>
                <li>Open <a href="https://developer.microsoft.com/en-us/graph/graph-explorer" target="_blank" rel="noreferrer">Microsoft Graph Explorer</a>.</li>
                <li>Sign in with the Outlook account you want Butler to inspect.</li>
                <li>Consent to <code>Mail.Read</code> when prompted.</li>
                <li>Use the explorer session token or an equivalent delegated access token with mail read access.</li>
                <li>Paste it here and click <code>Save Outlook</code>.</li>
              </ol>
              <p>This MVP expects a temporary delegated token with read access to the inbox.</p>
            </div>
          </section>
        </div>
      </section>

      {!sortedItems.length ? (
        <ButlerEmptyState />
      ) : (
        <div className="butler-queue__body">
          <ButlerQueueList items={sortedItems} artifacts={artifacts} selectedItemId={selectedItemId} onSelectItem={setSelectedItemId} />
          <ButlerItemDetail
            item={selectedItem}
            plan={selectedPlan}
            artifacts={selectedArtifacts}
            logs={selectedLogs}
            memoryPreferences={memoryPreferences}
            onOpenSourceNote={onOpenSourceNote}
            onSubmitClarification={onSubmitClarification}
          />
        </div>
      )}
    </section>
  );
}
