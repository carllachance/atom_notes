import { Fragment, useMemo, type ReactNode } from 'react';
import { InlineToken, parseMarkdownProjection } from '../markdownProjection';
import { getResolvedTaskFragments } from '../tasks/taskPromotions';
import { NoteCardModel, TaskState } from '../types';

type MarkdownProjectionViewProps = {
  source: string;
  note?: Pick<NoteCardModel, 'body' | 'promotedTaskFragments'>;
  taskStatesById?: Map<string, TaskState | undefined>;
  activeTaskId?: string | null;
  onOpenTask?: (taskNoteId: string) => void;
  onToggleCheckbox?: (lineIndex: number, checked: boolean) => void;
};

type InlineTaskFragment = ReturnType<typeof getResolvedTaskFragments>[number];

function renderTokenValue(token: InlineToken, value: string, key: string) {
  if (token.type === 'code') return <code key={key}>{value}</code>;
  if (token.type === 'link') {
    return (
      <a key={key} href={token.href} target="_blank" rel="noreferrer noopener">
        {value}
      </a>
    );
  }
  return <Fragment key={key}>{value}</Fragment>;
}

function renderInline(tokens: InlineToken[], taskFragments: InlineTaskFragment[] = [], taskStatesById?: Map<string, TaskState | undefined>, activeTaskId?: string | null, onOpenTask?: (taskNoteId: string) => void) {
  return tokens.map((token, index) => {
    const matchingFragments = token.type === 'text'
      ? taskFragments.filter((fragment) => fragment.start < token.end && fragment.end > token.start)
      : [];

    if (!matchingFragments.length) {
      return renderTokenValue(token, token.value, `${token.type}-${index}`);
    }

    const segments: ReactNode[] = [];
    let cursor = token.start;
    matchingFragments.forEach((fragment, fragmentIndex) => {
      const fragmentStart = Math.max(fragment.start, token.start);
      const fragmentEnd = Math.min(fragment.end, token.end);
      if (fragmentStart > cursor) {
        segments.push(renderTokenValue(token, token.value.slice(cursor - token.start, fragmentStart - token.start), `t-${index}-${fragmentIndex}-lead`));
      }
      const taskState = taskStatesById?.get(fragment.taskNoteId);
      const segmentValue = token.value.slice(fragmentStart - token.start, fragmentEnd - token.start);
      segments.push(
        <button
          key={`task-${fragment.id}-${fragmentIndex}`}
          type="button"
          className={`inline-task-fragment inline-task-fragment--${taskState ?? 'open'} ${activeTaskId === fragment.taskNoteId ? 'is-active' : ''} ${fragment.stale ? 'is-stale' : ''}`}
          onClick={() => onOpenTask?.(fragment.taskNoteId)}
          title={taskState === 'done' ? 'Open linked task · done' : 'Open linked task'}
        >
          {segmentValue}
        </button>
      );
      cursor = fragmentEnd;
    });

    if (cursor < token.end) {
      segments.push(renderTokenValue(token, token.value.slice(cursor - token.start), `t-${index}-tail`));
    }

    return <Fragment key={`token-${index}`}>{segments}</Fragment>;
  });
}

type CheckboxRowProps = {
  checked: boolean;
  disabled: boolean;
  children: ReactNode;
  onToggle?: (checked: boolean) => void;
};

function CheckboxRow({ checked, disabled, children, onToggle }: CheckboxRowProps) {
  const content = (
    <>
      <span className="markdown-checkbox-indicator" aria-hidden="true">
        <span className="markdown-checkbox-indicator-mark">{checked ? '✓' : ''}</span>
      </span>
      <span className="markdown-checkbox-copy">{children}</span>
    </>
  );

  if (disabled) {
    return (
      <div className="markdown-checkbox-row markdown-checkbox-row--static" role="checkbox" aria-checked={checked}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="markdown-checkbox-row markdown-checkbox-row--interactive"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onToggle?.(!checked)}
    >
      {content}
    </button>
  );
}

export function MarkdownProjectionView({ source, note, taskStatesById, activeTaskId = null, onOpenTask, onToggleCheckbox }: MarkdownProjectionViewProps) {
  const blocks = useMemo(() => parseMarkdownProjection(source), [source]);
  const taskFragments = useMemo(() => (note ? getResolvedTaskFragments(note) : []), [note]);

  if (!blocks.length) return <p className="markdown-empty">No content yet.</p>;

  return (
    <div className="markdown-projection" aria-label="Rendered note body">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const HeadingTag = `h${Math.min(4, block.level)}` as 'h1' | 'h2' | 'h3' | 'h4';
          return <HeadingTag key={`h-${index}`}>{renderInline(block.tokens, taskFragments, taskStatesById, activeTaskId, onOpenTask)}</HeadingTag>;
        }

        if (block.type === 'paragraph') {
          return <p key={`p-${index}`}>{renderInline(block.tokens, taskFragments, taskStatesById, activeTaskId, onOpenTask)}</p>;
        }

        if (block.type === 'decision' || block.type === 'open_question' || block.type === 'follow_up') {
          const label = block.type === 'decision'
            ? 'Decision'
            : block.type === 'open_question'
              ? 'Open question'
              : 'Follow-up';
          return (
            <p key={`semantic-${index}`} className={`markdown-semantic-block markdown-semantic-block--${block.type}`}>
              <strong>{label}:</strong>{' '}
              {renderInline(block.tokens, taskFragments, taskStatesById, activeTaskId, onOpenTask)}
            </p>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote key={`q-${index}`}>
              {block.lines.map((line, lineIndex) => (
                <p key={`ql-${lineIndex}`}>{renderInline(line, taskFragments, taskStatesById, activeTaskId, onOpenTask)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'unordered_list' || block.type === 'ordered_list') {
          const ListTag = block.type === 'unordered_list' ? 'ul' : 'ol';
          return (
            <ListTag key={`list-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`i-${itemIndex}`} data-has-checkbox={item.checked !== null}>
                  {item.checked !== null ? (
                    <CheckboxRow
                      checked={item.checked}
                      disabled={!onToggleCheckbox}
                      onToggle={(checked) => onToggleCheckbox?.(item.lineIndex, checked)}
                    >
                      {renderInline(item.tokens, taskFragments, taskStatesById, activeTaskId, onOpenTask)}
                    </CheckboxRow>
                  ) : (
                    <span>{renderInline(item.tokens, taskFragments, taskStatesById, activeTaskId, onOpenTask)}</span>
                  )}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <pre key={`code-${index}`}>
            {block.language ? <small>{block.language}</small> : null}
            <code>{block.code}</code>
          </pre>
        );
      })}
    </div>
  );
}
