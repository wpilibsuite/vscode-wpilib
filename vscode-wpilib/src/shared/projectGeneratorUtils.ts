'use strict';

import * as glob from 'glob';
import * as path from 'path';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import { mkdirpAsync, ncpAsync, readFileAsync, writeFileAsync } from '../utilities';
import * as fileUtils from './fileUtils';
import * as pathUtils from './pathUtils';
import { setExecutePermissions } from './permissions';

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
function gradleCopyFilter(sourcePath: string, fromGradleFolder: string): boolean {
  const rooted = path.relative(fromGradleFolder, sourcePath);
  if (rooted.startsWith('bin') || rooted.indexOf('.project') >= 0) {
    return false;
  }
  return true;
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
 * Setup project structure and copy Gradle files.
 * @param fromGradleFolder The folder where the files, like build.gradle, for a specific project type are located.
 * @param toFolder The folder to copy files to.
 * @param grRoot The folder where the extension's Gradle files are.
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
    await ncpAsync(path.join(grRoot, 'shared'), toFolder, {
      filter: (cf) => gradleCopyFilter(cf, fromGradleFolder),
    });

    // Set execute permissions on gradlew
    await setExecutePermissions(path.join(toFolder, 'gradlew'));

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
    return await fileUtils.updateFileContents(buildGradlePath, (content) =>
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
    // Already done when files were copied to the code path
    if (directGradleImport) {
      return true;
    }

    const deployDir = path.join(toFolder, 'src', 'main', 'deploy');
    await mkdirpAsync(deployDir);

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
      path.join(deployDir, 'example.txt'),
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
    const vendorDir = path.join(toFolder, 'vendordeps');
    await mkdirpAsync(vendorDir);

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
  const grVersionFile = path.join(grRoot, 'version.txt');
  return (await readFileAsync(grVersionFile, 'utf8')).trim();
}
