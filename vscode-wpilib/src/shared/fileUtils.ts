'use strict';

import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger';

export async function processFile(
  file: string,
  basePath: string,
  replacements: Map<RegExp, string>
) {
  return updateFileContents(path.join(basePath, file), (content) => {
    // Apply all replacements
    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }
    return content;
  });
}

/**
 * Safely updates file contents by reading and writing atomically
 */
export async function updateFileContents(
  filePath: string,
  replacer: (content: string) => string
): Promise<boolean> {
  try {
    const fileContent = await readFile(filePath, 'utf8');
    const updatedContent = replacer(fileContent);
    if (fileContent !== updatedContent) {
      await writeFile(filePath, updatedContent, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    logger.error('Failed to update file contents', err);
    return false;
  }
}
