import { ClipboardEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  BlockConversionType,
  convertBlockType,
  getBlockPrefix,
  parseSemanticBlocks,
  SemanticEditableBlock,
  serializeSemanticBlocks
} from '../notes/semanticBlocks';
import { mergeWithPreviousBlock, pasteIntoBlocks, splitBlockOnEnter } from '../notes/semanticEditorOps';

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
  onSelectionChange?: (selection: { start: number; end: number; text: string } | null) => void;
};

type SuggestionItem =
  | { kind: 'existing'; id: string; label: string }
  | { kind: 'create'; label: string };

const BLOCK_CONVERSIONS: Array<{ type: BlockConversionType; label: string; title: string }> = [
  { type: 'paragraph', label: '¶', title: 'Convert to paragraph' },
  { type: 'heading', label: 'H', title: 'Convert to heading' },
  { type: 'checklist_item', label: '☑', title: 'Convert to checklist' },
  { type: 'decision', label: 'D', title: 'Convert to decision' },
  { type: 'open_question', label: '?', title: 'Convert to open question' },
  { type: 'follow_up', label: '↗', title: 'Convert to follow-up' }
];

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
  onChangeProactiveSuggestionType,
  onSelectionChange
}: InlineNoteLinkEditorProps) {
  const blockRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [blocks, setBlocks] = useState<SemanticEditableBlock[]>(() => parseSemanticBlocks(note.body));
  const [activeCursor, setActiveCursor] = useState<number | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [pendingCaret, setPendingCaret] = useState<number | null>(null);
  const [pendingBlockFocus, setPendingBlockFocus] = useState<{ index: number; caret: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);

  const bodyFromBlocks = useMemo(() => serializeSemanticBlocks(blocks), [blocks]);
  const blockStarts = useMemo(() => {
    const starts: number[] = [];
    let cursor = 0;
    blocks.forEach((block, index) => {
      starts[index] = cursor;
      cursor += getBlockPrefix(block).length + block.text.length + 1;
    });
    return starts;
  }, [blocks]);

  useEffect(() => {
    if (bodyFromBlocks === note.body) return;
    setBlocks(parseSemanticBlocks(note.body));
  }, [note.body, bodyFromBlocks]);

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
    if (pendingCaret == null || !blocks.length) return;
    let targetIndex = blocks.length - 1;
    for (let index = 0; index < blocks.length; index += 1) {
      const blockStart = (blockStarts[index] ?? 0) + getBlockPrefix(blocks[index]).length;
      const blockEnd = blockStart + blocks[index].text.length;
      if (pendingCaret <= blockEnd) {
        targetIndex = index;
        break;
      }
    }

    const targetStart = (blockStarts[targetIndex] ?? 0) + getBlockPrefix(blocks[targetIndex]).length;
    setPendingBlockFocus({ index: targetIndex, caret: Math.max(0, pendingCaret - targetStart) });
    setPendingCaret(null);
  }, [pendingCaret, blocks, blockStarts]);

  useEffect(() => {
    if (!pendingBlockFocus) return;
    const target = blockRefs.current[pendingBlockFocus.index];
    if (!target) return;
    target.focus();
    target.setSelectionRange(pendingBlockFocus.caret, pendingBlockFocus.caret);
    setPendingBlockFocus(null);
  }, [pendingBlockFocus, blocks]);

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

  const commitBlocks = (nextBlocks: SemanticEditableBlock[]) => {
    setBlocks(nextBlocks);
    onBodyChange(serializeSemanticBlocks(nextBlocks));
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

  const handleBlockSelection = (index: number) => {
    const field = blockRefs.current[index];
    if (!field) return;
    const localStart = field.selectionStart;
    const localEnd = field.selectionEnd;
    const currentBlock = blocks[index];
    if (!currentBlock) return;
    const globalBase = (blockStarts[index] ?? 0) + getBlockPrefix(currentBlock).length;
    const start = globalBase + localStart;
    const end = globalBase + localEnd;
    setActiveCursor(start);
    const text = note.body.slice(start, end);
    const nextSelection = start === end ? null : { start, end, text };
    setSelectionRange(nextSelection);
    onSelectionChange?.(nextSelection);
  };

  const handleSplitBlockOnEnter = (index: number, caret: number) => {
    const result = splitBlockOnEnter(blocks, index, caret);
    commitBlocks(result.blocks);
    setPendingBlockFocus(result.focus);
  };

  const handleBackspaceAtStart = (index: number) => {
    const result = mergeWithPreviousBlock(blocks, index);
    commitBlocks(result.blocks);
    setPendingBlockFocus(result.focus);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>, index: number) => {
    const pastedText = event.clipboardData?.getData('text/plain') ?? '';
    if (!pastedText.includes('\n')) return;
    event.preventDefault();
    const result = pasteIntoBlocks(
      blocks,
      index,
      event.currentTarget.selectionStart,
      event.currentTarget.selectionEnd,
      pastedText
    );
    commitBlocks(result.blocks);
    setPendingBlockFocus(result.focus);
  };

  const applyBlockConversion = (index: number, nextType: BlockConversionType) => {
    const block = blocks[index];
    if (!block) return;
    const next = [...blocks];
    next[index] = convertBlockType(block, nextType);
    commitBlocks(next);
    setPendingBlockFocus({ index, caret: next[index].text.length });
  };

  return (
    <div className="inline-link-editor">
      <div className="note-body-field semantic-block-editor" role="group" aria-label="Note body markdown">
        {blocks.map((block, index) => (
          <div key={block.id} className={`semantic-block-row semantic-block-row--${block.type}`}>
            {block.type === 'heading' ? <span className="semantic-block-prefix">{'#'.repeat(block.level)}</span> : null}
            {block.type === 'checklist_item' ? (
              <label className="semantic-block-check">
                <input
                  type="checkbox"
                  checked={block.checked}
                  onChange={(event) => {
                    const next = [...blocks];
                    next[index] = { ...block, checked: event.target.checked };
                    commitBlocks(next);
                  }}
                />
              </label>
            ) : null}
            <textarea
              ref={(element) => {
                blockRefs.current[index] = element;
              }}
              className="semantic-block-input"
              placeholder={index === 0 ? 'Write freely…' : ''}
              value={block.text}
              onChange={(event) => {
                const next = [...blocks];
                next[index] = { ...block, text: event.target.value };
                commitBlocks(next);
                const base = (blockStarts[index] ?? 0) + getBlockPrefix(block).length;
                setActiveCursor(base + event.target.selectionStart);
              }}
              onClick={() => handleBlockSelection(index)}
              onKeyUp={() => handleBlockSelection(index)}
              onSelect={() => handleBlockSelection(index)}
              onKeyDown={(event) => {
                if (suggestionItems.length) {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveSuggestionIndex((cursorIndex) => (cursorIndex + 1) % suggestionItems.length);
                    return;
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveSuggestionIndex((cursorIndex) => (cursorIndex - 1 + suggestionItems.length) % suggestionItems.length);
                    return;
                  }
                  if (event.key === 'Enter' || event.key === 'Tab') {
                    event.preventDefault();
                    const activeItem = suggestionItems[activeSuggestionIndex] ?? suggestionItems[0];
                    if (activeItem) commitSuggestion(activeItem);
                    return;
                  }
                }

                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSplitBlockOnEnter(index, event.currentTarget.selectionStart);
                } else if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0) {
                  event.preventDefault();
                  handleBackspaceAtStart(index);
                } else if (event.key === 'Escape') {
                  setActiveCursor(null);
                }
              }}
              onPaste={(event) => handlePaste(event, index)}
            />
            <div className="semantic-block-actions" aria-label="Change block type">
              {BLOCK_CONVERSIONS.map((conversion) => (
                <button
                  key={conversion.type}
                  type="button"
                  className={`semantic-block-action ${block.type === conversion.type ? 'is-active' : ''}`}
                  title={conversion.title}
                  aria-label={conversion.title}
                  onClick={() => applyBlockConversion(index, conversion.type)}
                >
                  {conversion.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

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
