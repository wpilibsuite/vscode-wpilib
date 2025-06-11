'use strict';

import * as path from 'path';
const glob = require('glob');
import { localize as i18n } from '../i18n/locale';
import { logger } from '../../logger';
import { ncpAsync, readFileAsync, writeFileAsync } from '../../utilities';
import { setExecutePermissions } from './permissions';
import * as pathUtils from './pathUtils';

export type CopyCallback = (srcFolder: string, rootFolder: string) => Promise<boolean>;

/**
 * Common patterns used in text replacements
 */
export const ReplacementPatterns = {
  GRADLE_RIO_MARKER: '###GRADLERIOREPLACE###',
  ROBOT_CLASS_MARKER: '###ROBOTCLASSREPLACE###',
  JAVA_PACKAGE_PATTERN: 'edu\\.wpi\\.first\\.wpilibj\\.(?:examples|templates)\\..+?(?=;|\\.)',
};

/**
 * Common vendordep file names
 */
export const VendorDepFiles = {
  COMMANDS: 'WPILibNewCommands.json',
  ROMI: 'RomiVendordep.json',
  XRP: 'XRPVendordep.json',
};

/**
 * Filter function for excluding files from gradle copy operations
 */
export function gradleCopyFilter(sourcePath: string, fromGradleFolder: string): boolean {
  const rooted = path.relative(fromGradleFolder, sourcePath);
  if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
    return false;
  }
  return true;
}

/**
 * Copy and process template files with regex replacements
 * @param files List of files to process
 * @param basePath Base path where files are located
 * @param replacements Map of regex patterns and their replacements
 */
export async function processTemplateFiles(
  files: string[],
  basePath: string,
  replacements: Map<string | RegExp, string>
): Promise<boolean> {
  const promiseArray: Promise<void>[] = [];

  for (const filePath of files) {
    const fullPath = pathUtils.joinPath(basePath, filePath);
    promiseArray.push(
      (async () => {
        try {
          const content = await readFileAsync(fullPath, 'utf8');
          let processedContent = content;

          // Apply all replacements
          for (const [pattern, replacement] of replacements) {
            processedContent = processedContent.replace(
              pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g'),
              replacement
            );
          }

          await writeFileAsync(fullPath, processedContent, 'utf8');
        } catch (error) {
          logger.error(`Error processing template file: ${fullPath}`, error);
          throw error;
        }
      })()
    );
  }

  try {
    await Promise.all(promiseArray);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Find all files matching pattern
 */
export async function findMatchingFiles(
  baseDir: string,
  pattern: string = '**/*{.java,.gradle}'
): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    glob(
      pattern,
      {
        cwd: baseDir,
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
}

/**
 * Copy source template folder to destination
 */
export async function copyTemplateFolder(
  sourceFolder: string | CopyCallback,
  destinationPath: string,
  rootFolder: string
): Promise<boolean> {
  try {
    if (typeof sourceFolder === 'string') {
      await ncpAsync(sourceFolder, destinationPath);
    } else {
      // Use the callback for custom copy logic
      await sourceFolder(destinationPath, rootFolder);
    }
    return true;
  } catch (error) {
    logger.error(`Failed to copy template folder to ${destinationPath}`, error);
    return false;
  }
}

/**
 * Setup project structure and copy Gradle files
 */
export async function setupProjectStructure(
  fromGradleFolder: string,
  toFolder: string,
  grRoot: string
): Promise<boolean> {
  try {
    // Copy gradle files
    await ncpAsync(fromGradleFolder, toFolder, {
      filter: (cf) => gradleCopyFilter(cf, fromGradleFolder),
    });

    // Copy shared gradle files
    await ncpAsync(pathUtils.joinPath(grRoot, 'shared'), toFolder, {
      filter: (cf) => gradleCopyFilter(cf, fromGradleFolder),
    });

    // Set execute permissions on gradlew
    await setExecutePermissions(pathUtils.getGradlewPath(toFolder));

    return true;
  } catch (error) {
    logger.error('Failed to setup project structure', error);
    return false;
  }
}

/**
 * Update Gradle version in the build.gradle file
 */
export async function updateGradleRioVersion(
  buildGradlePath: string,
  gradleRioVersion: string
): Promise<boolean> {
  try {
    return await pathUtils.updateFileContents(buildGradlePath, (content) =>
      content.replace(new RegExp(ReplacementPatterns.GRADLE_RIO_MARKER, 'g'), gradleRioVersion)
    );
  } catch (error) {
    logger.error('Failed to update Gradle RIO version', error);
    return false;
  }
}

/**
 * Setup deploy directory with example text
 */
export async function setupDeployDirectory(
  toFolder: string,
  directGradleImport: boolean,
  isJava: boolean
): Promise<boolean> {
  try {
    if (directGradleImport) {
      return true;
    }

    const deployDir = pathUtils.joinPath(toFolder, 'src', 'main', 'deploy');
    await pathUtils.ensureDirectory(deployDir);

    const hintKey = isJava ? 'generateJavaDeployHint' : 'generateCppDeployHint';
    const hintText = isJava
      ? `Files placed in this directory will be deployed to the RoboRIO into the
'deploy' directory in the home folder. Use the 'Filesystem.getDeployDirectory' wpilib function
to get a proper path relative to the deploy directory.`
      : `Files placed in this directory will be deployed to the RoboRIO into the
'deploy' directory in the home folder. Use the 'frc::filesystem::GetDeployDirectory'
function from the 'frc/Filesystem.h' header to get a proper path relative to the deploy
directory.`;

    await writeFileAsync(
      pathUtils.joinPath(deployDir, 'example.txt'),
      i18n('generator', [hintKey, hintText])
    );

    return true;
  } catch (error) {
    logger.error('Failed to setup deploy directory', error);
    return false;
  }
}

/**
 * Setup vendordeps directory and copy required vendordep files
 */
export async function setupVendorDeps(
  resourcesFolder: string,
  toFolder: string,
  extraVendordeps: string[] = []
): Promise<boolean> {
  try {
    const vendorDir = pathUtils.getVendorDepsPath(toFolder);
    await pathUtils.ensureDirectory(vendorDir);

    // Add WPILib New Commands
    await pathUtils.copyVendorDep(resourcesFolder, VendorDepFiles.COMMANDS, vendorDir);

    // Add extra vendordeps
    for (const vendordep of extraVendordeps) {
      if (vendordep === 'romi') {
        await pathUtils.copyVendorDep(resourcesFolder, VendorDepFiles.ROMI, vendorDir);
      } else if (vendordep === 'xrp') {
        await pathUtils.copyVendorDep(resourcesFolder, VendorDepFiles.XRP, vendorDir);
      }
    }

    return true;
  } catch (error) {
    logger.error('Failed to setup vendordeps', error);
    return false;
  }
}

/**
 * Get the Gradle RIO version from version.txt
 */
export async function getGradleRioVersion(grRoot: string): Promise<string> {
  const grVersionFile = pathUtils.joinPath(grRoot, 'version.txt');
  return (await readFileAsync(grVersionFile, 'utf8')).trim();
}
