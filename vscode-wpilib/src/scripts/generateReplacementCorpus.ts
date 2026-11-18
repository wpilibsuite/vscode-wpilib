'use strict';

import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import { configs, generateCorpus, getCorpusPath, loadGroups } from '../test/replacementCorpus';

async function main(): Promise<void> {
  await mkdir(path.dirname(getCorpusPath(configs[0])), { recursive: true });

  for (const config of configs) {
    const groups = await loadGroups(config.replacementsFile);
    const corpusPath = getCorpusPath(config);
    await writeFile(corpusPath, generateCorpus(groups, config.label), 'utf8');
    console.log(`Updated ${corpusPath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
