'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../../logger';
import { ncpAsync, readFileAsync, writeFileAsync } from '../../utilities';
import * as pathUtils from './pathUtils';

/**
 * Filter function for copying files based on file extension
 */
export interface IFileCopyFilter {
  (sourcePath: string): boolean;
}

/**
 * Copy files from source to destination with optional filter
 */
export async function copyFiles(
  sourceFolder: string,
  destinationFolder: string,
  filter?: IFileCopyFilter,
  trackCopiedFiles: boolean = false
): Promise<string[]> {
  const copiedFiles: string[] = [];

  try {
    await ncpAsync(sourceFolder, destinationFolder, {
      filter: (filePath: string): boolean => {
        // Track copied files if requested
        if (trackCopiedFiles && fs.lstatSync(filePath).isFile()) {
          copiedFiles.push(path.relative(sourceFolder, filePath));
        }

        // Apply custom filter if provided
        if (filter) {
          return filter(filePath);
        }

        return true;
      },
    });

    return copiedFiles;
  } catch (error) {
    logger.error(`Error copying files from ${sourceFolder} to ${destinationFolder}:`, error);
    throw error;
  }
}

/**
 * Process text file content with replacements
 */
export async function processFileContent(
  filePath: string,
  replacements: Map<string | RegExp, string>
): Promise<void> {
  try {
    const content = await readFileAsync(filePath, 'utf8');
    let processedContent = content;

    // Apply all replacements
    for (const [pattern, replacement] of replacements) {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');
      processedContent = processedContent.replace(regex, replacement);
    }

    await writeFileAsync(filePath, processedContent, 'utf8');
  } catch (error) {
    logger.error(`Error processing file: ${filePath}`, error);
    throw error;
  }
}

/**
 * Process multiple files with the same replacements
 */
export async function processFiles(
  files: string[],
  basePath: string,
  replacements: Map<string | RegExp, string>
): Promise<boolean> {
  try {
    const promises = files.map(async (file) => {
      const fullPath = pathUtils.joinPath(basePath, file);
      await processFileContent(fullPath, replacements);
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    logger.error('Error processing files:', error);
    return false;
  }
}

/**
 * Rename files based on pattern replacement
 */
export async function renameFiles(
  files: string[],
  basePath: string,
  pattern: string | RegExp,
  replacement: string,
  openInEditor: boolean = false
): Promise<string[]> {
  const renamePromises: Promise<string>[] = [];
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');

  for (const filePath of files) {
    const fullPath = pathUtils.joinPath(basePath, filePath);
    const filename = path.basename(fullPath);

    // Only rename files matching the pattern
    if (filename.match(regex)) {
      const directory = path.dirname(fullPath);
      const newName = filename.replace(regex, replacement);
      const newPath = pathUtils.joinPath(directory, newName);

      renamePromises.push(
        new Promise<string>((resolve, reject) => {
          fs.rename(fullPath, newPath, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(newPath);
            }
          });
        })
      );
    }
  }

  try {
    const renamedFiles = await Promise.all(renamePromises);

    // Open renamed files in editor if requested
    if (openInEditor && renamedFiles.length > 0) {
      for (const file of renamedFiles) {
        try {
          const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
          await vscode.window.showTextDocument(document);
        } catch (err) {
          logger.warn(`Failed to open renamed file: ${file}`, err);
        }
      }
    }

    return renamedFiles;
  } catch (error) {
    logger.error('Error renaming files:', error);
    throw error;
  }
}

/**
 * Filter that only includes specified file extensions
 */
export function createFileExtensionFilter(extensions: string[]): IFileCopyFilter {
  return (sourcePath: string): boolean => {
    if (!fs.lstatSync(sourcePath).isFile()) {
      return true; // Always include directories
    }

    const ext = path.extname(sourcePath).toLowerCase();
    return extensions.includes(ext);
  };
}

/**
 * Filter that only includes files with specific names
 */
export function createFileNameFilter(fileNames: string[]): IFileCopyFilter {
  return (sourcePath: string): boolean => {
    if (!fs.lstatSync(sourcePath).isFile()) {
      return true; // Always include directories
    }

    const basename = path.basename(sourcePath);
    return fileNames.includes(basename);
  };
}
