'use strict';

import { readdir } from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger';
import { copyFileAsync, readFileAsync, writeFileAsync } from '../utilities';

/**
 * Creates source and test paths based on project type and import mode
 */
export function getProjectPaths(
  toFolder: string,
  copyRoot: string = '',
  directGradleImport: boolean = false
): {
  codePath: string;
  testPath: string;
} {
  let codePath: string;
  let testPath: string;

  if (directGradleImport) {
    codePath = path.join(toFolder, 'src');
    testPath = path.join(toFolder, 'src', 'test');
  } else {
    if (copyRoot) {
      // Java style paths with package structure
      codePath = path.join(toFolder, 'src', 'main', 'java', copyRoot);
      testPath = path.join(toFolder, 'src', 'test', 'java', copyRoot);
    } else {
      // C++ style paths without package structure
      codePath = path.join(toFolder, 'src', 'main');
      testPath = path.join(toFolder, 'src', 'test');
    }
  }

  return { codePath, testPath };
}

/**
 * Safely updates file contents by reading and writing atomically
 */
export async function updateFileContents(
  filePath: string,
  replacer: (content: string) => string
): Promise<boolean> {
  try {
    const fileContent = await readFileAsync(filePath, 'utf8');
    const updatedContent = replacer(fileContent);
    if (fileContent !== updatedContent) {
      await writeFileAsync(filePath, updatedContent, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    logger.error('Failed to update file contents', err);
    return false;
  }
}

/**
 * Copies a vendordep file to the project
 */
export async function copyVendorDep(
  resourcesFolder: string,
  vendorDepName: string,
  targetDir: string
): Promise<boolean> {
  try {
    const sourcePath = path.join(path.dirname(resourcesFolder), 'vendordeps', vendorDepName);
    const targetPath = path.join(targetDir, vendorDepName);
    await copyFileAsync(sourcePath, targetPath);
    return true;
  } catch (err) {
    logger.error(`Failed to copy vendor dependency: ${vendorDepName}`, err);
    return false;
  }
}

/**
 * Checks if a folder is empty
 */
export async function isFolderEmpty(folderPath: string): Promise<boolean> {
  try {
    const files = await readdir(folderPath);
    return files.length === 0;
  } catch (err) {
    // If folder doesn't exist, we consider it empty
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return true;
    }
    throw err;
  }
}
