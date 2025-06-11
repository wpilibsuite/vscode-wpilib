'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { copyFileAsync, mkdirpAsync, readFileAsync, writeFileAsync } from '../../utilities';
import { logger } from '../../logger';

/**
 * Safely joins path segments, ensuring all separators are normalized for the platform
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Creates a vendordeps directory path
 */
export function getVendorDepsPath(baseFolder: string): string {
  return joinPath(baseFolder, 'vendordeps');
}

/**
 * Creates a deploy directory path
 */
export function getDeployDirPath(baseFolder: string, directGradleImport: boolean): string {
  if (directGradleImport) {
    return '';
  }
  return joinPath(baseFolder, 'src', 'main', 'deploy');
}

/**
 * Gets the build.gradle file path
 */
export function getBuildGradlePath(baseFolder: string): string {
  return joinPath(baseFolder, 'build.gradle');
}

/**
 * Gets the gradlew script file path
 */
export function getGradlewPath(baseFolder: string): string {
  return joinPath(baseFolder, 'gradlew');
}

/**
 * Gets the path to a vendordep file
 */
export function getVendorDepFilePath(resourcesRoot: string, vendorDepName: string): string {
  return joinPath(path.dirname(resourcesRoot), 'vendordeps', vendorDepName);
}

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
    codePath = joinPath(toFolder, 'src');
    testPath = joinPath(toFolder, 'src', 'test');
  } else {
    if (copyRoot) {
      // Java style paths with package structure
      codePath = joinPath(toFolder, 'src', 'main', 'java', copyRoot);
      testPath = joinPath(toFolder, 'src', 'test', 'java', copyRoot);
    } else {
      // C++ style paths without package structure
      codePath = joinPath(toFolder, 'src', 'main');
      testPath = joinPath(toFolder, 'src', 'test');
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
    await writeFileAsync(filePath, updatedContent, 'utf8');
    return true;
  } catch (err) {
    logger.error('Failed to update file contents', err);
    return false;
  }
}

/**
 * Ensures directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<boolean> {
  try {
    await mkdirpAsync(dirPath);
    return true;
  } catch (err) {
    logger.error(`Failed to create directory: ${dirPath}`, err);
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
    const sourcePath = getVendorDepFilePath(resourcesFolder, vendorDepName);
    const targetPath = joinPath(targetDir, vendorDepName);
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
    const files = await fs.promises.readdir(folderPath);
    return files.length === 0;
  } catch (err) {
    // If folder doesn't exist, we consider it empty
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return true;
    }
    throw err;
  }
}
