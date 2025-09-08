'use strict';

import * as fs from 'fs';
import { rename } from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger';
import { ncpAsync } from '../utilities';
import { updateFileContents } from './pathUtils';

/**
 * A copy files wrapper function that also returns all copied files. Can throw exceptions.
 */
export async function copyAndReturnFiles(
  sourceFolder: string,
  destinationFolder: string,
  filter?: (sourcePath: string) => boolean
): Promise<string[]> {
  const copiedFiles: string[] = [];
  await ncpAsync(sourceFolder, destinationFolder, {
    filter: (filePath: string): boolean => {
      // Apply custom filter if provided
      if (filter) {
        // Track copied files if requested
        if (filter(filePath) && fs.lstatSync(filePath).isFile()) {
          copiedFiles.push(path.relative(sourceFolder, filePath));
        }
        return filter(filePath);
      }
      if (fs.lstatSync(filePath).isFile()) {
        copiedFiles.push(path.relative(sourceFolder, filePath));
      }

      return true;
    },
  });

  return copiedFiles;
}

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
 * Rename files based on pattern replacement
 */
export async function renameFiles(
  files: string[],
  basePath: string,
  pattern: string | RegExp,
  replacement: string
): Promise<string[]> {
  const renamePromises: Promise<string>[] = [];
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;

  for (const filePath of files) {
    const fullPath = path.join(basePath, filePath);
    const filename = path.basename(fullPath);

    // Only rename files matching the pattern
    if (filename.match(regex)) {
      const directory = path.dirname(fullPath);
      const newName = filename.replace(regex, replacement);
      const newPath = path.join(directory, newName);

      renamePromises.push(
        (async () => {
          await rename(fullPath, newPath);
          return newPath;
        })()
      );
    }
  }

  try {
    return await Promise.all(renamePromises);
  } catch (error) {
    logger.error('Error renaming files:', error);
    throw error;
  }
}

/**
 * Create a filter function that takes in a path to a file and checks if the file names matches a list of file names
 */
export function createFileNameFilter(fileNames: string[]) {
  return (sourcePath: string): boolean => {
    if (!fs.lstatSync(sourcePath).isFile()) {
      return true; // Always include directories
    }

    const basename = path.basename(sourcePath);
    return fileNames.includes(basename);
  };
}
