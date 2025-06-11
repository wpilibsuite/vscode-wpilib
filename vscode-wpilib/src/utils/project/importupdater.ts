'use strict';

import * as jsonc from 'jsonc-parser';
const glob = require('glob');
import { logger } from '../../logger';
import { readFileAsync } from '../../utilities';
import * as pathUtils from './pathUtils';
import * as fileUtils from './fileUtils';

interface IReplaceGroup {
  from: string;
  to: string;
}

interface IToUpdate {
  fileMatcher: string;
  flags: string;
  replacements: IReplaceGroup[];
}

export async function ImportUpdate(srcDir: string, updateFile: string): Promise<boolean> {
  try {
    const toUpdate = await readFileAsync(updateFile, 'utf8');
    const toUpdateParsed: IToUpdate[] = jsonc.parse(toUpdate) as IToUpdate[];

    // Enumerate through each updater
    for (const updater of toUpdateParsed) {
      // Find files matching the pattern
      const toUpdateFiles = await new Promise<string[]>((resolve, reject) => {
        glob(
          updater.fileMatcher,
          {
            cwd: srcDir,
            nodir: true,
            nomount: true,
          },
          (err: Error | null, matches: string[]) => {
            if (err) {
              reject(err);
            } else {
              resolve(matches);
            }
          }
        );
      });

      // Create replacements map
      const replacements = new Map<string | RegExp, string>();

      // Add all replacements from the updater config
      for (const replace of updater.replacements) {
        replacements.set(new RegExp(replace.from, updater.flags), replace.to);
      }

      // Process all matched files with the replacements
      await Promise.all(
        toUpdateFiles.map(async (filePath) => {
          const fullPath = pathUtils.joinPath(srcDir, filePath);
          try {
            await fileUtils.processFileContent(fullPath, replacements);
          } catch (error) {
            logger.error(`Failed to update file: ${filePath}`, error);
            throw error;
          }
        })
      );
    }

    return true;
  } catch (error) {
    logger.error('Failed to update project files', error);
    return false;
  }
}
