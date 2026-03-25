import { parseMarkdownProjection } from '../markdownProjection';

export type Provenance = {
  origin: 'user' | 'ai' | 'imported' | 'source';
  sourceRefIds?: string[];
  createdAt: string;
  updatedAt?: string;
  confidence?: number;
};

export type CoreBlock =
  | { id: string; type: 'paragraph'; text: string; provenance?: Provenance }
  | { id: string; type: 'heading'; level: 1 | 2 | 3; text: string; provenance?: Provenance }
  | { id: string; type: 'checklist_item'; text: string; checked: boolean; provenance?: Provenance }
  | { id: string; type: 'bulleted_item'; text: string; provenance?: Provenance }
  | { id: string; type: 'numbered_item'; text: string; order?: number; provenance?: Provenance }
  | { id: string; type: 'quote'; text: string; provenance?: Provenance }
  | { id: string; type: 'code'; text: string; language?: string; provenance?: Provenance }
  | { id: string; type: 'divider'; provenance?: Provenance }
  | { id: string; type: 'callout'; text: string; tone?: 'info' | 'warning' | 'idea'; provenance?: Provenance };

export type AtomBlock =
  | { id: string; type: 'decision'; text: string; provenance?: Provenance }
  | { id: string; type: 'open_question'; text: string; provenance?: Provenance }
  | { id: string; type: 'follow_up'; text: string; status?: 'suggested' | 'accepted' | 'dismissed'; provenance?: Provenance }
  | { id: string; type: 'source_reference'; refId: string; label: string; href?: string; provenance?: Provenance }
  | { id: string; type: 'evidence'; text: string; sourceRefIds?: string[]; provenance?: Provenance }
  | { id: string; type: 'ai_suggestion'; text: string; status: 'proposed' | 'accepted' | 'rejected'; provenance?: Provenance }
  | { id: string; type: 'tag_set'; tags: string[]; provenance?: Provenance }
  | { id: string; type: 'related_note'; noteId: string; label?: string; provenance?: Provenance }
  | { id: string; type: 'status_marker'; value: 'inbox' | 'backlog' | 'doing' | 'waiting' | 'done'; provenance?: Provenance };

export type SemanticBlock = CoreBlock | AtomBlock;

export type NoteDocument = {
  version: 1;
  blocks: SemanticBlock[];
};

export type NoteBody =
  | { kind: 'legacy_text'; text: string }
  | { kind: 'document'; document: NoteDocument };

function blockId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function readInlineText(tokens: Array<{ value: string }>): string {
  return tokens.map((token) => token.value).join('');
}

export function legacyTextToDocument(text: string): NoteDocument {
  const parsed = parseMarkdownProjection(text);
  const blocks: SemanticBlock[] = [];

  parsed.forEach((block, index) => {
    if (block.type === 'heading') {
      blocks.push({
        id: blockId('heading', index),
        type: 'heading',
        level: Math.min(3, Math.max(1, block.level)) as 1 | 2 | 3,
        text: readInlineText(block.tokens)
      });
      return;
    }

    if (block.type === 'paragraph') {
      blocks.push({
        id: blockId('paragraph', index),
        type: 'paragraph',
        text: readInlineText(block.tokens)
      });
      return;
    }

    if (block.type === 'decision') {
      blocks.push({
        id: blockId('decision', index),
        type: 'decision',
        text: readInlineText(block.tokens)
      });
      return;
    }

    if (block.type === 'open_question') {
      blocks.push({
        id: blockId('question', index),
        type: 'open_question',
        text: readInlineText(block.tokens)
      });
      return;
    }

    if (block.type === 'follow_up') {
      blocks.push({
        id: blockId('follow', index),
        type: 'follow_up',
        text: readInlineText(block.tokens),
        status: 'suggested'
      });
      return;
    }

    if (block.type === 'blockquote') {
      blocks.push({
        id: blockId('quote', index),
        type: 'quote',
        text: block.lines.map((line) => readInlineText(line)).join('\n')
      });
      return;
    }

    if (block.type === 'unordered_list') {
      block.items.forEach((item, itemIndex) => {
        if (item.checked === null) {
          blocks.push({
            id: blockId('bullet', index * 10 + itemIndex),
            type: 'bulleted_item',
            text: readInlineText(item.tokens)
          });
          return;
        }

        blocks.push({
          id: blockId('check', index * 10 + itemIndex),
          type: 'checklist_item',
          text: readInlineText(item.tokens),
          checked: item.checked
        });
      });
      return;
    }

    if (block.type === 'ordered_list') {
      block.items.forEach((item, itemIndex) => {
        blocks.push({
          id: blockId('number', index * 10 + itemIndex),
          type: 'numbered_item',
          text: readInlineText(item.tokens),
          order: itemIndex + 1
        });
      });
      return;
    }

    if (block.type === 'code_block') {
      blocks.push({
        id: blockId('code', index),
        type: 'code',
        text: block.code,
        language: block.language || undefined
      });
    }
  });

  return { version: 1, blocks };
}

export function documentToLegacyText(document: NoteDocument): string {
  const lines: string[] = [];

  document.blocks.forEach((block) => {
    if (block.type === 'paragraph') lines.push(block.text);
    if (block.type === 'heading') lines.push(`${'#'.repeat(block.level)} ${block.text}`);
    if (block.type === 'checklist_item') lines.push(`- [${block.checked ? 'x' : ' '}] ${block.text}`);
    if (block.type === 'bulleted_item') lines.push(`- ${block.text}`);
    if (block.type === 'numbered_item') lines.push(`${block.order ?? 1}. ${block.text}`);
    if (block.type === 'quote') lines.push(...block.text.split('\n').map((line) => `> ${line}`));
    if (block.type === 'code') lines.push('```' + (block.language ?? ''), block.text, '```');
    if (block.type === 'divider') lines.push('---');
    if (block.type === 'callout') lines.push(`> [!${(block.tone ?? 'info').toUpperCase()}] ${block.text}`);
    if (block.type === 'decision') lines.push(`Decision: ${block.text}`);
    if (block.type === 'open_question') lines.push(`Question: ${block.text}`);
    if (block.type === 'follow_up') lines.push(`Follow-up${block.status ? ` (${block.status})` : ''}: ${block.text}`);
    if (block.type === 'source_reference') lines.push(`[${block.label}](${block.href ?? block.refId})`);
    if (block.type === 'evidence') lines.push(`Evidence: ${block.text}`);
    if (block.type === 'ai_suggestion') lines.push(`AI suggestion (${block.status}): ${block.text}`);
    if (block.type === 'tag_set') lines.push(block.tags.map((tag) => `#${tag}`).join(' '));
    if (block.type === 'related_note') lines.push(`Related: [[${block.label ?? block.noteId}]]`);
    if (block.type === 'status_marker') lines.push(`Status: ${block.value}`);

    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

export function noteBodyToDocument(body: NoteBody): NoteDocument {
  if (body.kind === 'document') return body.document;
  return legacyTextToDocument(body.text);
}

export function createNoteBodyFromLegacyText(text: string): NoteBody {
  return { kind: 'document', document: legacyTextToDocument(text) };
}
