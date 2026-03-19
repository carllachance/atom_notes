import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles = readFileSync('src/styles.css', 'utf8');

test('canvas shell keeps the workspace in the flexible middle row and preserves min-height guardrails', () => {
  assert.match(styles, /\.thinking-surface\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/);
  assert.match(styles, /\.workspace-shell\s*\{[\s\S]*grid-row:\s*2;[\s\S]*min-height:\s*0;[\s\S]*height:\s*100%;/);
  assert.match(styles, /\.view-layer-canvas\s*\{[\s\S]*display:\s*flex;/);
  assert.match(styles, /\.spatial-canvas\s*\{[\s\S]*flex:\s*1 1 auto;/);
});
