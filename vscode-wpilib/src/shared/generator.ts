'use strict';

import * as path from 'path';
import { logger } from '../logger';
import { ncpAsync } from '../utilities';
import * as fileUtils from './fileUtils';
import * as pathUtils from './pathUtils';
import * as genUtils from './projectGeneratorUtils';

export async function generateCopyCpp(
  resourcesFolder: string,
  fromTemplateFolder: string,
  fromTemplateTestFolder: string | undefined,
  fromGradleFolder: string,
  toFolder: string,
  directGradleImport: boolean,
  extraVendordeps: string[]
): Promise<boolean> {
  try {
    // Check if destination folder is empty
    if (!(await pathUtils.isFolderEmpty(toFolder))) {
      logger.warn('Destination folder is not empty');
      return false;
    }

    // Get project paths
    const { codePath, testPath } = pathUtils.getProjectPaths(toFolder, '', directGradleImport);

    // Get the GradleRIO version
    const grRoot = path.dirname(fromGradleFolder);
    const gradleRioVersion = await genUtils.getGradleRioVersion(grRoot);

    // Copy template folders
    await ncpAsync(fromTemplateFolder, codePath);
    if (fromTemplateTestFolder !== undefined) {
      await ncpAsync(fromTemplateTestFolder, testPath);
    }

    // Setup project structure
    await genUtils.setupProjectStructure(fromGradleFolder, toFolder, grRoot);

    // Update gradle file with correct version
    await genUtils.updateGradleRioVersion(path.join(toFolder, 'build.gradle'), gradleRioVersion);

    // Setup deploy directory
    await genUtils.setupDeployDirectory(toFolder, directGradleImport, false);

    // Setup vendor dependencies
    await genUtils.setupVendorDeps(resourcesFolder, toFolder, extraVendordeps);

    return true;
  } catch (e) {
    logger.error('C++ project creation failure', e);
    return false;
  }
}

export async function generateCopyJava(
  resourcesFolder: string,
  fromTemplateFolder: string,
  fromTemplateTestFolder: string | undefined,
  fromGradleFolder: string,
  toFolder: string,
  robotClassTo: string,
  copyRoot: string,
  directGradleImport: boolean,
  extraVendordeps: string[],
  packageReplaceString?: string
): Promise<boolean> {
  try {
    // Check if destination folder is empty
    if (!(await pathUtils.isFolderEmpty(toFolder))) {
      logger.warn('Destination folder is not empty');
      return false;
    }

    // Get project paths
    const { codePath, testPath } = pathUtils.getProjectPaths(
      toFolder,
      copyRoot,
      directGradleImport
    );

    // Get the GradleRIO version
    const grRoot = path.dirname(fromGradleFolder);
    const gradleRioVersion = await genUtils.getGradleRioVersion(grRoot);

    // Copy template folders
    await ncpAsync(fromTemplateFolder, codePath);
    if (fromTemplateTestFolder !== undefined) {
      await ncpAsync(fromTemplateTestFolder, testPath);
    }

    // Find files that need template processing
    const files = await genUtils.findMatchingFiles(codePath);

    // Create replacements map
    const replacements = new Map<RegExp, string>();
    replacements.set(
      new RegExp(genUtils.ReplacementPatterns.JAVA_PACKAGE_PATTERN, 'g'),
      'frc.robot'
    );
    if (packageReplaceString !== undefined) {
      replacements.set(new RegExp(packageReplaceString, 'g'), 'frc.robot');
    }

    // Process template files
    await Promise.all(
      files.map((testFile) => fileUtils.processFile(testFile, codePath, replacements))
    );

    // Process test files if they exist
    if (fromTemplateTestFolder !== undefined) {
      const testFiles = await genUtils.findMatchingFiles(testPath);
      await Promise.all(
        testFiles.map((testFile) => fileUtils.processFile(testFile, testPath, replacements))
      );
    }

    // Setup project structure
    await genUtils.setupProjectStructure(fromGradleFolder, toFolder, grRoot);

    // Update gradle file with correct version and robot class
    await fileUtils.updateFileContents(path.join(toFolder, 'build.gradle'), (content) =>
      content
        .replace(new RegExp(genUtils.ReplacementPatterns.ROBOT_CLASS_MARKER, 'g'), robotClassTo)
        .replace(new RegExp(genUtils.ReplacementPatterns.GRADLE_RIO_MARKER, 'g'), gradleRioVersion)
    );

    // Setup deploy directory
    await genUtils.setupDeployDirectory(toFolder, directGradleImport, true);

    // Setup vendor dependencies
    await genUtils.setupVendorDeps(resourcesFolder, toFolder, extraVendordeps);

    return true;
  } catch (e) {
    logger.error('Java project creation failure', e);
    return false;
  }
}

export async function setDesktopEnabled(buildgradle: string, setting: boolean): Promise<void> {
  await fileUtils.updateFileContents(buildgradle, (content) =>
    content.replace(
      /def\s+includeDesktopSupport\s*=\s*(true|false)/gm,
      `def includeDesktopSupport = ${setting ? 'true' : 'false'}`
    )
  );
}
