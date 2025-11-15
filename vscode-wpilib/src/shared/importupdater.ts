'use strict';

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import { logger } from '../logger';
import { updateFileContents } from './fileUtils';

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
    const toUpdate = await readFile(updateFile, 'utf8');
    const toUpdateParsed: IToUpdate[] = jsonc.parse(toUpdate) as IToUpdate[];

    // Enumerate through each updater
    for (const updater of toUpdateParsed) {
      // Find files matching the pattern
      const toUpdateFiles = await glob(updater.fileMatcher, {
        cwd: srcDir,
        nodir: true,
      });

      // Create replacements map
      const replacements = new Map<RegExp, string>();

      // Add all replacements from the updater config
      for (const replace of updater.replacements) {
        replacements.set(new RegExp(replace.from, updater.flags), replace.to);
      }

      // Process all matched files with the replacements
      await Promise.all(
        toUpdateFiles.map(async (filePath) => {
          const fullPath = path.join(srcDir, filePath);
          try {
            await updateFileContents(fullPath, (content: string) => {
              // Apply all replacements
              for (const [pattern, replacement] of replacements) {
                content = content.replace(pattern, replacement);
              }
              return content;
            });
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
