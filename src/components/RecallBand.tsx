import { useMemo, useState } from 'react';
import { FocusMode, Lens } from '../types';
import { HistoryStackEntry, StateSnapshot } from '../types/reeentory';
import { FocusSuggestion } from '../scene/focusSuggestions';
import type { SceneStoreMode } from '../scene/sceneStorage';
import { getLensWorkspaceIds } from '../scene/lens';

type RecallBandProps = {
  lens: Lens;
  focusMode: FocusMode;
  focusCount: number;
  revealQuery: string;
  onSetLens: (lens: Lens) => void;
  onOpenComposer: () => void;
  onRevealQueryChange: (query: string) => void;
  onReveal: () => void;
  historyStack: HistoryStackEntry[];
  bookmarks: StateSnapshot[];
  reentryExpanded: boolean;
  onToggleReentry: () => void;
  onRestoreHistory: (entry: HistoryStackEntry) => void;
  onRestoreBookmark: (bookmark: StateSnapshot) => void;
  focusSuggestions: FocusSuggestion[];
  sceneMode: SceneStoreMode;
  onSetSceneMode: (mode: SceneStoreMode) => void;
  onResetToDefault: () => void;
};

function RibbonButton({
  children,
  className = '',
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return <button type="button" className={`ribbon-button ${className}`.trim()} onClick={onClick}>{children}</button>;
}

export function RecallBand({
  lens,
  focusMode,
  focusCount,
  revealQuery,
  onSetLens,
  onOpenComposer,
  onRevealQueryChange,
  onReveal,
  historyStack,
  bookmarks,
  reentryExpanded,
  onToggleReentry,
  onRestoreHistory,
  onRestoreBookmark,
  focusSuggestions,
  sceneMode,
  onSetSceneMode,
  onResetToDefault
}: RecallBandProps) {
  const [pinOpen, setPinOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const focusBadge = useMemo(() => {
    if (focusCount > 0) return `${focusCount}`;
    return `${focusSuggestions.length} suggested`;
  }, [focusCount, focusSuggestions.length]);
  const workspaceScopeCount = useMemo(() => lens.kind === 'workspace' ? getLensWorkspaceIds(lens).length : 0, [lens]);
  const hasScopedState = lens.kind !== 'universe' || revealQuery.trim().length > 0 || focusMode.isolate || !focusMode.highlight;

  return (
    <header className="workspace-ribbon">
      <RibbonButton className="ribbon-button--primary" onClick={onOpenComposer}>Capture</RibbonButton>

      <div className="ribbon-slot">
        <RibbonButton className="ribbon-button--where" onClick={onToggleReentry}>Where was I?</RibbonButton>
        {reentryExpanded ? (
          <div className="ribbon-popover ribbon-popover--scroll">
            {historyStack.map((entry) => (
              <button key={entry.id} type="button" onClick={() => onRestoreHistory(entry)}>
                <strong>{entry.noteTitle || 'Untitled note'}</strong>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
              </button>
            ))}
            {!historyStack.length ? <p>No recent path yet.</p> : null}
          </div>
        ) : null}
      </div>

      <div className="ribbon-slot">
        <RibbonButton onClick={() => setPinOpen((value) => !value)}>Pinned</RibbonButton>
        {pinOpen ? (
          <div className="ribbon-popover">
            {bookmarks.length ? bookmarks.slice(0, 5).map((bookmark) => (
              <button key={bookmark.id} type="button" onClick={() => onRestoreBookmark(bookmark)}>
                <strong>{bookmark.label}</strong>
                <span>Saved view</span>
              </button>
            )) : <p>No pins yet.</p>}
          </div>
        ) : null}
      </div>

      <div className="ribbon-slot">
        <RibbonButton onClick={() => setFocusOpen((value) => !value)}>Focus <small>{focusBadge}</small></RibbonButton>
        {focusOpen ? (
          <div className="ribbon-popover">
            {focusCount > 0 ? (
              <p>{focusCount} notes are confirmed in Focus. Focus stays separate from pins and lens selection.</p>
            ) : (
              focusSuggestions.map((candidate) => (
                <button key={candidate.noteId} type="button" className="is-suggested" onClick={() => onSetLens({ kind: 'universe' })}>
                  <strong>{candidate.label}</strong>
                  <span>{candidate.reason}</span>
                </button>
              ))
            )}
            {!focusCount && !focusSuggestions.length ? <p>No high-confidence candidates yet.</p> : null}
          </div>
        ) : null}
      </div>

      <RibbonButton className={lens.kind === 'library' ? 'active' : ''} onClick={() => onSetLens(lens.kind === 'library' ? { kind: 'universe' } : { kind: 'library' })}>
        Library
      </RibbonButton>

      <RibbonButton className={hasScopedState ? 'ribbon-button--reset active' : 'ribbon-button--reset'} onClick={onResetToDefault}>
        Reset view
      </RibbonButton>

      <form
        className="ribbon-search"
        onSubmit={(event) => {
          event.preventDefault();
          onReveal();
        }}
      >
        <input
          aria-label="Search everything"
          placeholder="Search"
          value={revealQuery}
          onChange={(event) => onRevealQueryChange(event.target.value)}
        />
      </form>

      <div className="ribbon-slot">
        <RibbonButton onClick={() => setSpaceOpen((value) => !value)}>Space</RibbonButton>
        {spaceOpen ? (
          <div className="ribbon-popover ribbon-popover--space">
            <button type="button" className={sceneMode === 'sample' ? 'active' : ''} onClick={() => onSetSceneMode('sample')}>
              <strong>Sample notes</strong>
              <span>Open the preloaded demo workspace.</span>
            </button>
            <button type="button" className={sceneMode === 'blank' ? 'active' : ''} onClick={() => onSetSceneMode('blank')}>
              <strong>Start fresh</strong>
              <span>Switch to a blank local workspace for your own notes.</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="ribbon-lens-state">
        <span>{lens.kind === 'workspace' ? workspaceScopeCount > 1 ? `${workspaceScopeCount} workspace lens` : 'Workspace lens' : lens.kind === 'project' ? 'Project lens' : lens.kind === 'library' ? 'Library lens' : focusMode.isolate ? 'Focus only' : 'Universe'}</span>
      </div>
    </header>
  );
}
