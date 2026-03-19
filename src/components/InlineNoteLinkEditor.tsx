import { useEffect, useMemo, useRef, useState } from 'react';
import { getDetailSurfaceRelationshipOption } from '../detailSurface/detailSurfaceModel';
import { getCompactDisplayTitle, getDisplayTitle } from '../noteText';
import { getResolvedTaskFragments } from '../tasks/taskPromotions';
import { NoteCardModel, RelationshipType } from '../types';
import {
  extractResolvedInlineLinks,
  findActiveWikiLink,
  getMatchingNotes,
  inferRelationshipTypeFromContext,
  ProactiveLinkSuggestion
} from '../relationships/inlineLinking';

type InlineLinkTarget = {
  targetId: string;
  label: string;
  type: RelationshipType;
};

type InlineNoteLinkEditorProps = {
  note: NoteCardModel;
  notes: NoteCardModel[];
  relationshipsByTargetId: Map<string, { relationshipId: string; type: RelationshipType }>;
  highlightedTargetId: string | null;
  proactiveSuggestions: Array<ProactiveLinkSuggestion & { selectedType: RelationshipType }>;
  onBodyChange: (body: string) => void;
  onPromoteSelectionToTask: (selection: { start: number; end: number; text: string }) => void;
  onCreateLink: (target: InlineLinkTarget) => void;
  onCreateLinkedNote: (title: string, type: RelationshipType) => string | null;
  onUpdateRelationshipType: (relationshipId: string, type: RelationshipType, targetId: string) => void;
  onHighlightTarget: (targetId: string) => void;
  onClearHighlight: (targetId: string) => void;
  onAcceptProactiveSuggestion: (suggestionId: string) => void;
  onDismissProactiveSuggestion: (suggestionId: string) => void;
  onChangeProactiveSuggestionType: (suggestionId: string, type: RelationshipType) => void;
};

type SuggestionItem =
  | { kind: 'existing'; id: string; label: string }
  | { kind: 'create'; label: string };

export function InlineNoteLinkEditor({
  note,
  notes,
  relationshipsByTargetId,
  highlightedTargetId,
  proactiveSuggestions,
  onBodyChange,
  onPromoteSelectionToTask,
  onCreateLink,
  onCreateLinkedNote,
  onUpdateRelationshipType,
  onHighlightTarget,
  onClearHighlight,
  onAcceptProactiveSuggestion,
  onDismissProactiveSuggestion,
  onChangeProactiveSuggestionType
}: InlineNoteLinkEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeCursor, setActiveCursor] = useState<number | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [pendingCaret, setPendingCaret] = useState<number | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);

  const activeMatch = useMemo(() => {
    if (activeCursor == null) return null;
    return findActiveWikiLink(note.body, activeCursor);
  }, [activeCursor, note.body]);

  const inferredRelationship = useMemo(() => {
    if (!activeMatch) return null;
    return inferRelationshipTypeFromContext(note.body, activeMatch.start);
  }, [activeMatch, note.body]);

  const matchingNotes = useMemo(() => {
    if (!activeMatch) return [];
    return getMatchingNotes(notes, note.id, activeMatch.query);
  }, [activeMatch, note.id, notes]);

  const suggestionItems = useMemo(() => {
    if (!activeMatch) return [] as SuggestionItem[];
    const existing = matchingNotes.map((candidate) => ({
      kind: 'existing' as const,
      id: candidate.id,
      label: getDisplayTitle(candidate)
    }));
    const normalizedQuery = activeMatch.query.trim();
    const alreadyExact = matchingNotes.some((candidate) => getDisplayTitle(candidate).toLowerCase() === normalizedQuery.toLowerCase());
    return normalizedQuery && !alreadyExact
      ? [...existing, { kind: 'create' as const, label: normalizedQuery }]
      : existing;
  }, [activeMatch, matchingNotes]);

  const resolvedLinks = useMemo(() => extractResolvedInlineLinks(note.body, notes), [note.body, notes]);
  const promotedFragments = useMemo(() => getResolvedTaskFragments(note), [note]);

  const canPromoteSelection = Boolean(
    selectionRange &&
    selectionRange.start !== selectionRange.end &&
    !selectionRange.text.includes('\n') &&
    selectionRange.text.trim().length >= 3 &&
    !/[`\[\]]/.test(selectionRange.text)
  );

  useEffect(() => {
    if (pendingCaret == null || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pendingCaret, pendingCaret);
    setPendingCaret(null);
  }, [pendingCaret]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [activeMatch?.start, activeMatch?.query]);

  const replaceActiveWikiLink = (label: string) => {
    if (!activeMatch) return null;
    const replacement = `[[${label}]]`;
    const nextBody = `${note.body.slice(0, activeMatch.start)}${replacement}${note.body.slice(activeMatch.end)}`;
    onBodyChange(nextBody);
    setPendingCaret(activeMatch.start + replacement.length);
    return nextBody;
  };

  const commitSuggestion = (item: SuggestionItem) => {
    if (!activeMatch || !inferredRelationship) return;
    replaceActiveWikiLink(item.label);

    if (item.kind === 'existing') {
      onCreateLink({ targetId: item.id, label: item.label, type: inferredRelationship.type });
      setActiveCursor(null);
      return;
    }

    const targetId = onCreateLinkedNote(item.label, inferredRelationship.type);
    if (targetId) setActiveCursor(null);
  };

  const handleTextareaSelection = () => {
    if (!textareaRef.current) return;
    setActiveCursor(textareaRef.current.selectionStart);
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = note.body.slice(start, end);
    setSelectionRange(start === end ? null : { start, end, text });
  };

  return (
    <div className="inline-link-editor">
      <textarea
        ref={textareaRef}
        className="note-body-field"
        aria-label="Note body markdown"
        placeholder="Write freely…"
        value={note.body}
        onChange={(event) => {
          onBodyChange(event.target.value);
          setActiveCursor(event.target.selectionStart);
        }}
        onClick={handleTextareaSelection}
        onKeyUp={handleTextareaSelection}
        onSelect={handleTextareaSelection}
        onBlur={() => window.setTimeout(() => setActiveCursor((cursor) => cursor), 0)}
        onKeyDown={(event) => {
          if (!suggestionItems.length) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveSuggestionIndex((index) => (index + 1) % suggestionItems.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveSuggestionIndex((index) => (index - 1 + suggestionItems.length) % suggestionItems.length);
          } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const activeItem = suggestionItems[activeSuggestionIndex] ?? suggestionItems[0];
            if (activeItem) commitSuggestion(activeItem);
          } else if (event.key === 'Escape') {
            setActiveCursor(null);
          }
        }}
      />

      {activeMatch && inferredRelationship ? (
        <div className="inline-link-dropdown" role="listbox" aria-label="Inline note link suggestions">
          <div className="inline-link-dropdown-head">
            <strong>Link while writing</strong>
            <span>
              Inferred as <em>{getDetailSurfaceRelationshipOption(inferredRelationship.type).label}</em>
            </span>
          </div>
          <p className="inline-link-dropdown-copy">{inferredRelationship.reason}</p>
          <div className="inline-link-suggestion-list">
            {suggestionItems.length ? (
              suggestionItems.map((item, index) => {
                const isActive = index === activeSuggestionIndex;
                return (
                  <button
                    key={`${item.kind}-${item.kind === 'existing' ? item.id : item.label}`}
                    type="button"
                    className={`inline-link-suggestion ${isActive ? 'active' : ''}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      commitSuggestion(item);
                    }}
                  >
                    <span className="inline-link-suggestion-main">
                      <strong>{item.label}</strong>
                      <small>{item.kind === 'existing' ? 'Existing note' : 'Create new note inline'}</small>
                    </span>
                    <span className="inline-link-suggestion-type">{getDetailSurfaceRelationshipOption(inferredRelationship.type).label}</span>
                  </button>
                );
              })
            ) : (
              <p className="inline-link-empty">Keep typing to narrow the note you want to connect.</p>
            )}
          </div>
        </div>
      ) : null}

      {proactiveSuggestions.length ? (
        <div className="inline-link-proactive" aria-label="Suggested note links">
          <div className="inline-link-proactive-head">
            <strong>Suggested links</strong>
            <span>Optional · click to link</span>
          </div>
          <div className="inline-link-proactive-list">
            {proactiveSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="inline-link-proactive-row"
                onMouseEnter={() => onHighlightTarget(suggestion.targetId)}
                onMouseLeave={() => onClearHighlight(suggestion.targetId)}
              >
                <button type="button" className="inline-link-proactive-main" onClick={() => onAcceptProactiveSuggestion(suggestion.id)}>
                  <strong>{suggestion.targetTitle}</strong>
                  <small>{suggestion.reason}</small>
                </button>
                <select
                  aria-label={`Suggested relationship type for ${suggestion.targetTitle}`}
                  value={suggestion.selectedType}
                  onChange={(event) => onChangeProactiveSuggestionType(suggestion.id, event.target.value as RelationshipType)}
                >
                  <option value="related">Related</option>
                  <option value="references">References</option>
                  <option value="depends_on">Depends on</option>
                  <option value="supports">Supports</option>
                  <option value="contradicts">Contradicts</option>
                  <option value="leads_to">Leads to</option>
                  <option value="part_of">Part of</option>
                  <option value="derived_from">Derived from</option>
                </select>
                <button type="button" className="ghost-button" onClick={() => onAcceptProactiveSuggestion(suggestion.id)}>
                  Link
                </button>
                <button
                  type="button"
                  className="inline-link-dismiss"
                  aria-label={`Dismiss suggestion for ${suggestion.targetTitle}`}
                  onClick={() => onDismissProactiveSuggestion(suggestion.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {resolvedLinks.length ? (
        <div className="inline-link-chip-list" aria-label="Inline linked notes">
          {resolvedLinks.map((link) => {
            if (!link.targetId) {
              return (
                <div key={`${link.start}-${link.label}`} className="inline-link-chip inline-link-chip--unresolved">
                  <span>{`[[${link.label}]]`}</span>
                  <small>No matching note yet</small>
                </div>
              );
            }

            const relationship = relationshipsByTargetId.get(link.targetId);
            const targetId = link.targetId;
            return (
              <div
                key={`${link.start}-${targetId}`}
                className={`inline-link-chip ${highlightedTargetId === targetId ? 'inline-link-chip--highlighted' : ''}`}
                onMouseEnter={() => onHighlightTarget(targetId)}
                onMouseLeave={() => onClearHighlight(targetId)}
              >
                <button type="button" className="inline-link-chip-note" onClick={() => onHighlightTarget(targetId)}>
                  {`[[${getCompactDisplayTitle(notes.find((candidate) => candidate.id === targetId) ?? { title: link.label, body: '' }, 28)}]]`}
                </button>
                {relationship ? (
                  <select
                    aria-label={`Relationship type for ${link.label}`}
                    value={relationship.type}
                    onChange={(event) => onUpdateRelationshipType(relationship.relationshipId, event.target.value as RelationshipType, targetId)}
                  >
                    <option value="related">Related</option>
                    <option value="references">References</option>
                    <option value="depends_on">Depends on</option>
                    <option value="supports">Supports</option>
                    <option value="contradicts">Contradicts</option>
                    <option value="leads_to">Leads to</option>
                    <option value="part_of">Part of</option>
                    <option value="derived_from">Derived from</option>
                  </select>
                ) : (
                  <small>Missing relationship</small>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {(selectionRange || promotedFragments.length) ? (
        <div className="inline-task-editor-bar" aria-label="Promoted task fragments">
          <div className="inline-task-editor-copy">
            <strong>Task fragments</strong>
            <small>
              {canPromoteSelection
                ? 'Selection ready to promote without removing it from the note.'
                : promotedFragments.length
                  ? `${promotedFragments.length} linked ${promotedFragments.length === 1 ? 'fragment' : 'fragments'} in this note.`
                  : 'Select a short fragment to promote it into a task.'}
            </small>
          </div>
          <button
            type="button"
            className="ghost-button"
            disabled={!canPromoteSelection}
            onClick={() => {
              if (!selectionRange || !canPromoteSelection) return;
              onPromoteSelectionToTask(selectionRange);
              setSelectionRange(null);
            }}
          >
            Promote to Task
          </button>
        </div>
      ) : null}
    </div>
  );
}
