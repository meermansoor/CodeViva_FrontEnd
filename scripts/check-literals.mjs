// scripts/check-literals.mjs
// Fails (exit 1) when forbidden literals appear outside the allowed files.
// Add a trailing comment  // literal-ok  to a line to exempt it on purpose.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

const RULES = [
  { name: 'hardcoded host', re: /localhost|127[.]0[.]0[.]1/, allow: ['config/env.js'] },
  { name: 'hardcoded http(s) URL', re: /https?:[/][/]/, allow: ['config/env.js', 'constants/endpoints.js', 'services/api.js'], ignore: /www[.]w3[.]org/ },
  { name: 'hardcoded /api path', re: /['"`][/]api[/]/, allow: ['constants/endpoints.js'] },
  { name: 'token key literal', re: /['"](teacherToken|studentToken)['"]/, allow: ['constants/storage.js'] },
  { name: 'direct axios import', re: /from +['"]axios['"]/, allow: ['services/api.js'] },
];

const NEWLINE = String.fromCharCode(10);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /[.](js|jsx|ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const problems = [];
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/');
  readFileSync(file, 'utf8').split(NEWLINE).forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    if (line.includes('literal-ok')) return;
    for (const rule of RULES) {
      if (rule.allow.includes(rel)) continue;
      if (rule.ignore && rule.ignore.test(line)) continue;
      if (rule.re.test(line)) problems.push(rel + ':' + (i + 1) + '  [' + rule.name + ']  ' + trimmed);
    }
  });
}

if (problems.length) {
  console.error(problems.join(NEWLINE));
  console.error(NEWLINE + problems.length + ' forbidden literal(s) found.');
  process.exit(1);
}
console.log('check-literals: OK');
