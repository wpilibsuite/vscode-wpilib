'use strict';

import * as assert from 'assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import { ImportUpdate } from '../shared/importupdater';
import {
  configs,
  generateCorpus,
  getCorpusPath,
  getExtensionPath,
  IReplaceGroup,
  IToUpdate,
  loadGroups,
  makeFromContext,
  makeToContext,
} from './replacementCorpus';

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

suite('Replacement idempotence', () => {
  for (const config of configs) {
    suite(config.label, () => {
      let groups: IToUpdate[];

      suiteSetup(async () => {
        groups = await loadGroups(config.replacementsFile);
      });

      test(`${config.corpusFileName} is up to date`, async () => {
        const current = await readFile(getCorpusPath(config), 'utf8');
        assert.strictEqual(
          current.replace(/\r\n/g, '\n'),
          generateCorpus(groups, config.label),
          `${config.corpusFileName} is out of date. Run "npm run generate-replacement-corpus" and commit the updated file.`
        );
      });

      test(`running importer ${config.label} replacements twice does not change files on second run`, async function () {
        this.timeout(60000);
        const corpus = await readFile(getCorpusPath(config), 'utf8');
        const tmp = await mkdtemp(path.join(tmpdir(), 'wpilib-replacement-idempotence-'));
        try {
          const srcDir = path.join(tmp, 'src');
          await mkdir(srcDir, { recursive: true });

          const filePath = path.join(srcDir, config.corpusFileName);
          await writeFile(filePath, corpus, 'utf8');

          const replacementsPath = path.join(
            getExtensionPath(),
            'resources',
            config.replacementsFile
          );

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
        const corpus = generateCorpus(groups, config.label);
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
