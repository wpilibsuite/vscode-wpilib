'use strict';

import * as assert from 'assert';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import { ImportUpdate } from '../shared/importupdater';

interface IReplaceGroup {
  from: string;
  to: string;
}

interface IToUpdate {
  fileMatcher: string;
  flags: string;
  replacements: IReplaceGroup[];
}

interface ReplacementConfig {
  label: string;
  replacementsFile: string;
  corpusFileName: string;
  tempPrefix: string;
}

const configs: ReplacementConfig[] = [
  {
    label: 'C++',
    replacementsFile: 'cpp_replacements.json',
    corpusFileName: 'Corpus.cpp',
    tempPrefix: 'wpilib-cpp-idempotent-',
  },
  {
    label: 'Java',
    replacementsFile: 'java_replacements.json',
    corpusFileName: 'Corpus.java',
    tempPrefix: 'wpilib-java-idempotent-',
  },
];

function isCppHeaderReplacement(entry: IReplaceGroup): boolean {
  return (
    entry.to.includes('/') ||
    entry.to.endsWith('.h') ||
    entry.to.endsWith('.hpp') ||
    entry.from.includes('.h') ||
    entry.from.includes('\\.h')
  );
}

function isJavaImportLike(text: string): boolean {
  return /^(?:edu|org|java|com|javax|wpi)\./.test(text) || text.includes('import ');
}

function makeToContext(entry: IReplaceGroup): string {
  const to = entry.to;

  // Multi-line replacements or explicit include/import fragments.
  if (to.includes('\n') || to.includes('#include') || to.includes('import ')) {
    return to + '\n';
  }

  if (isCppHeaderReplacement(entry)) {
    return `#include "${to}"\n`;
  }

  if (isJavaImportLike(to)) {
    return `import ${to};\n`;
  }

  // Generic token/namespace replacement context.
  return `// context\n${to};\nObject x = ${to};\n`;
}

function stripLookarounds(from: string): string {
  // Remove lookbehind/lookahead groups like (?<!...) (?!...) (?<=...) (?=...)
  let s = from;
  for (let i = 0; i < 10; i++) {
    const next = s.replace(/\(\?<(!|=)[^()]*\)/g, '').replace(/\(\?(?:!|=)[^()]*\)/g, '');
    if (next === s) {
      break;
    }
    s = next;
  }
  return s;
}

function generateFromSample(from: string): string | undefined {
  let s = stripLookarounds(from);

  s = s.replace(/^\^/, '').replace(/\$$/, '');

  // Unescape common regex escapes to literals.
  s = s
    .replace(/\\\./g, '.')
    .replace(/\\\//g, '/')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\</g, '<')
    .replace(/\\>/g, '>')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']');

  // Replace character classes/patterns with representative text.
  s = s
    .replace(/\(\[\\w\\\/\]\*\)/g, 'Example')
    .replace(/\[\\w\\\/\]\*/g, 'Example')
    .replace(/\[\\w\]\*/g, 'Example')
    .replace(/\[\\s\]\*/g, ' ');

  // Common word-boundary/capture wrappers.
  s = s.replace(/\(\\b\)/g, '').replace(/\\b/g, '');

  // Collapse remaining simple groups used as captures in these rules.
  s = s.replace(/\(([^()|]+)\)/g, '$1');

  // Replace whitespace regex tokens.
  s = s.replace(/\\s\*/g, ' ').replace(/\\s\+/g, ' ').replace(/\\s/g, ' ');

  // Handle alternation by picking first option if simple.
  if (s.includes('|')) {
    s = s.split('|')[0];
  }

  // Remove leftover regex quantifiers/metacharacters that would make invalid sample text.
  s = s.replace(/[?*+]/g, '');

  // If it still looks too regex-y, skip.
  if (/[()[\]{}\\^$]/.test(s)) {
    return undefined;
  }

  s = s.trim();
  return s.length > 0 ? s : undefined;
}

function makeFromContext(entry: IReplaceGroup): string | undefined {
  const sample = generateFromSample(entry.from);
  if (!sample) {
    return undefined;
  }
  if (isCppHeaderReplacement(entry) || sample.includes('.h') || sample.includes('/')) {
    return `#include "${sample}"\n`;
  }
  if (isJavaImportLike(sample)) {
    return `import ${sample};\n`;
  }
  return `// context\n${sample};\nObject y = ${sample};\n`;
}

function applyGroups(content: string, groupsToApply: IToUpdate[]): string {
  let updated = content;
  for (const group of groupsToApply) {
    for (const entry of group.replacements) {
      const pattern = new RegExp(entry.from, group.flags);
      updated = updated.replace(pattern, entry.to);
    }
  }
  return updated;
}

function applyEntry(content: string, entry: IReplaceGroup, flags: string): string {
  const pattern = new RegExp(entry.from, flags);
  return content.replace(pattern, entry.to);
}

async function loadGroups(replacementsFile: string): Promise<IToUpdate[]> {
  const extensionPath = path.resolve(__dirname, '..', '..');
  const replacementsPath = path.join(extensionPath, 'resources', replacementsFile);
  const raw = await readFile(replacementsPath, 'utf8');
  const groups = JSON.parse(raw) as IToUpdate[];
  assert.ok(Array.isArray(groups) && groups.length > 0, `${replacementsFile} should load`);
  return groups;
}

suite('Replacement idempotence', () => {
  for (const config of configs) {
    suite(config.label, () => {
      let groups: IToUpdate[];

      suiteSetup(async () => {
        groups = await loadGroups(config.replacementsFile);
      });

      test(`running importer ${config.label} replacements twice does not change files on second run`, async function () {
        this.timeout(60000);
        const tmp = await mkdtemp(path.join(tmpdir(), config.tempPrefix));
        try {
          const srcDir = path.join(tmp, 'src');
          const { mkdir } = await import('fs/promises');
          await mkdir(srcDir, { recursive: true });

          // Corpus with a synthesized "from" sample (or "to" fallback) for every statement.
          const lines: string[] = [
            `// generated corpus for ${config.label} replacement idempotence`,
          ];
          let sampleCount = 0;
          for (const group of groups) {
            for (const entry of group.replacements) {
              const ctx = makeFromContext(entry);
              if (ctx) {
                lines.push(ctx);
                sampleCount++;
              } else {
                lines.push(makeToContext(entry));
              }
            }
          }
          assert.ok(sampleCount > 0, 'Should generate at least some from-samples');

          const filePath = path.join(srcDir, config.corpusFileName);
          await writeFile(filePath, lines.join('\n'), 'utf8');

          const extensionPath = path.resolve(__dirname, '..', '..');
          const replacementsPath = path.join(extensionPath, 'resources', config.replacementsFile);

          assert.ok(
            await ImportUpdate(srcDir, replacementsPath),
            'First ImportUpdate should succeed'
          );
          const afterFirst = await readFile(filePath, 'utf8');
          assert.ok(
            await ImportUpdate(srcDir, replacementsPath),
            'Second ImportUpdate should succeed'
          );
          const afterSecond = await readFile(filePath, 'utf8');

          assert.strictEqual(
            afterSecond,
            afterFirst,
            `${config.label} replacements must be idempotent when ImportUpdate is run twice`
          );
        } finally {
          await rm(tmp, { recursive: true, force: true });
        }
      });

      test(`each ${config.label} replacement statement is idempotent`, () => {
        const failures: string[] = [];
        let checked = 0;

        for (let gi = 0; gi < groups.length; gi++) {
          const group = groups[gi];
          for (let ri = 0; ri < group.replacements.length; ri++) {
            const entry = group.replacements[ri];
            const label = `group ${gi} replacement ${ri} (${entry.from} -> ${JSON.stringify(entry.to)})`;

            try {
              // Case 1: already-converted/target context must remain stable under this statement.
              const toCtx = makeToContext(entry);
              const onceTo = applyEntry(toCtx, entry, group.flags);
              const twiceTo = applyEntry(onceTo, entry, group.flags);
              if (onceTo !== twiceTo) {
                failures.push(
                  `${label}: not idempotent on target-context\n--- once ---\n${onceTo}\n--- twice ---\n${twiceTo}`
                );
              }
              checked++;

              // Case 2: if we can synthesize a from-sample, applying this statement twice must be stable.
              const fromCtx = makeFromContext(entry);
              if (fromCtx) {
                const onceFrom = applyEntry(fromCtx, entry, group.flags);
                const twiceFrom = applyEntry(onceFrom, entry, group.flags);
                if (onceFrom !== twiceFrom) {
                  failures.push(
                    `${label}: not idempotent on from-sample\nFROM:\n${fromCtx}\n--- once ---\n${onceFrom}\n--- twice ---\n${twiceFrom}`
                  );
                }
                checked++;
              }
            } catch (e) {
              failures.push(`${label}: error evaluating statement: ${(e as Error).message}`);
            }
          }
        }

        assert.ok(checked > 0, 'Should check at least one replacement case');
        assert.deepStrictEqual(
          failures,
          [],
          `Found non-idempotent ${config.label} replacement statements:\n${failures.join('\n\n')}`
        );
      });

      test(`applying all ${config.label} replacements twice is idempotent in-memory`, () => {
        const lines: string[] = ['// generated corpus'];
        for (const group of groups) {
          for (const entry of group.replacements) {
            lines.push(makeFromContext(entry) ?? makeToContext(entry));
          }
        }
        const corpus = lines.join('\n');
        const once = applyGroups(corpus, groups);
        const twice = applyGroups(once, groups);
        assert.strictEqual(
          twice,
          once,
          `Applying all ${config.label} replacement groups twice must be stable`
        );
      });
    });
  }
});
