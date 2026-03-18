import { build } from 'esbuild';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { __reset, __run } from '../src/test/vitest.ts';

const repoRoot = process.cwd();
const testsDir = path.join(repoRoot, 'src', '__tests__');
const tempDir = path.join(repoRoot, '.tmp-vitest');
await mkdir(tempDir, { recursive: true });

try {
  const entries = (await readdir(testsDir))
    .filter((file) => file.endsWith('.test.ts'))
    .sort((a, b) => a.localeCompare(b));

  __reset();

  for (const file of entries) {
    const entry = path.join(testsDir, file);
    const outfile = path.join(tempDir, `${file}.mjs`);
    await build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile,
      absWorkingDir: repoRoot,
      sourcemap: 'inline',
      target: 'es2020'
    });
    await import(pathToFileURL(outfile).href);
  }

  const result = await __run();
  console.log(`\n${result.passed} passed, ${result.failed} failed`);
  if (result.failed > 0) process.exitCode = 1;
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
