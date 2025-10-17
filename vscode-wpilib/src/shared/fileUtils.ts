'use strict';

import { readFile, writeFile } from 'fs/promises';
import { logger } from '../logger';

/**
 * Updates a file using a set of regex replacements.
 * @param filePath The absolute path to a file.
 * @param replacements The regexes and what they are to be replaced with.
 */
export async function processFile(filePath: string, replacements: Map<RegExp, string>) {
  return updateFileContents(filePath, (content) => {
    // Apply all replacements
    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }
    return content;
  });
}

/**
 * Safely updates file contents by reading and writing atomically.
 * @param filePath The absolute path to a file.
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
