import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }

    if (!path.endsWith('.js')) continue;

    const source = readFileSync(path, 'utf8');
    const rewritten = source.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g, (_, prefix, specifier, suffix) => {
      if (specifier.endsWith('.js') || specifier.endsWith('.json')) return `${prefix}${specifier}${suffix}`;
      return `${prefix}${specifier}.js${suffix}`;
    });

    if (rewritten !== source) writeFileSync(path, rewritten);
  }
}

walk('dist-tests');
