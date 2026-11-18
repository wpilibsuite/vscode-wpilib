'use strict';

import * as assert from 'assert';
import { readFile } from 'fs/promises';
import * as path from 'path';

export interface IReplaceGroup {
  from: string;
  to: string;
}

export interface IToUpdate {
  fileMatcher: string;
  flags: string;
  replacements: IReplaceGroup[];
}

export interface ReplacementConfig {
  label: string;
  replacementsFile: string;
  corpusFileName: string;
}

export const configs: ReplacementConfig[] = [
  {
    label: 'C++',
    replacementsFile: 'cpp_replacements.json',
    corpusFileName: 'corpus.cpp',
  },
  {
    label: 'Java',
    replacementsFile: 'java_replacements.json',
    corpusFileName: 'corpus.java',
  },
];

export function getExtensionPath(): string {
  return path.resolve(__dirname, '..', '..');
}

export function getCorpusPath(config: ReplacementConfig): string {
  return path.join(getExtensionPath(), 'src', 'test', 'corpus', config.corpusFileName);
}

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

function getCaptureGroupSamples(pattern: string): string[] {
  const samples: string[] = [];
  const stack: Array<{ start: number; capturing: boolean }> = [];
  let inCharClass = false;
  let escaped = false;

  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === '\\') {
      escaped = true;
      continue;
    }
    if (inCharClass) {
      if (c === ']') {
        inCharClass = false;
      }
      continue;
    }
    if (c === '[') {
      inCharClass = true;
      continue;
    }
    if (c === '(') {
      const rest = pattern.slice(i);
      const nonCapturing =
        rest.startsWith('(?:') || /^\(\?[=!]/.test(rest) || /^\(\?<[=!]/.test(rest);
      stack.push({ start: i + 1, capturing: !nonCapturing });
      continue;
    }
    if (c === ')' && stack.length > 0) {
      const group = stack.pop();
      if (group?.capturing) {
        // Zero-width groups (for example \b) have no sample text to substitute.
        samples.push(generateFromSample(pattern.slice(group.start, i)) ?? '');
      }
    }
  }

  return samples;
}

function renderTarget(to: string, from: string): string {
  const samples = getCaptureGroupSamples(from);
  const wholeSample = generateFromSample(from) ?? 'Example';

  return to.replace(/\$\$|\$\{(\d+)\}|\$(\d+)|\$&/g, (match, braced?: string, plain?: string) => {
    if (match === '$$') {
      return '$';
    }
    if (match === '$&') {
      return wholeSample;
    }
    const index = Number(braced ?? plain) - 1;
    return samples[index] ?? '';
  });
}

export function makeToContext(entry: IReplaceGroup): string {
  const to = renderTarget(entry.to, entry.from);

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
    .replace(/\(\[\\w(?:\\?\/)?\]\*\)/g, 'Example')
    .replace(/\[\\w(?:\\?\/)?\]\*/g, 'Example')
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

export function makeFromContext(entry: IReplaceGroup): string | undefined {
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

export async function loadGroups(replacementsFile: string): Promise<IToUpdate[]> {
  const replacementsPath = path.join(getExtensionPath(), 'resources', replacementsFile);
  const raw = await readFile(replacementsPath, 'utf8');
  const groups = JSON.parse(raw) as IToUpdate[];
  assert.ok(Array.isArray(groups) && groups.length > 0, `${replacementsFile} should load`);
  return groups;
}

export function generateCorpus(groups: IToUpdate[], label: string): string {
  // Corpus with a synthesized "from" sample (or "to" fallback) for every statement.
  const lines: string[] = [
    `// generated corpus for ${label} replacement idempotence. Do not modify file directly. Generate using "npm run generate-replacement-corpus"`,
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

  const corpus = lines.join('\n');
  assert.ok(
    !/\$\{?\d+\}?|\$&/.test(corpus),
    'Generated corpus must not contain regex replacement markers'
  );
  return corpus;
}
