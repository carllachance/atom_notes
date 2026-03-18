import { Fragment, useMemo } from 'react';
import { InlineToken, parseMarkdownProjection } from '../markdownProjection';

type MarkdownProjectionViewProps = {
  source: string;
  onToggleCheckbox?: (lineIndex: number, checked: boolean) => void;
};

function renderInline(tokens: InlineToken[]) {
  return tokens.map((token, index) => {
    if (token.type === 'code') return <code key={`c-${index}`}>{token.value}</code>;
    if (token.type === 'link') {
      return (
        <a key={`l-${index}`} href={token.href} target="_blank" rel="noreferrer noopener">
          {token.value}
        </a>
      );
    }
    return <Fragment key={`t-${index}`}>{token.value}</Fragment>;
  });
}

export function MarkdownProjectionView({ source, onToggleCheckbox }: MarkdownProjectionViewProps) {
  const blocks = useMemo(() => parseMarkdownProjection(source), [source]);

  if (!blocks.length) return <p className="markdown-empty">No content yet.</p>;

  return (
    <div className="markdown-projection" aria-label="Rendered note body">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const HeadingTag = `h${Math.min(4, block.level)}` as 'h1' | 'h2' | 'h3' | 'h4';
          return <HeadingTag key={`h-${index}`}>{renderInline(block.tokens)}</HeadingTag>;
        }

        if (block.type === 'paragraph') {
          return <p key={`p-${index}`}>{renderInline(block.tokens)}</p>;
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote key={`q-${index}`}>
              {block.lines.map((line, lineIndex) => (
                <p key={`ql-${lineIndex}`}>{renderInline(line)}</p>
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
                    <label className="markdown-checkbox-row">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(event) => onToggleCheckbox?.(item.lineIndex, event.target.checked)}
                      />
                      <span>{renderInline(item.tokens)}</span>
                    </label>
                  ) : (
                    <span>{renderInline(item.tokens)}</span>
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
