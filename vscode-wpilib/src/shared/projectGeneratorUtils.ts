'use strict';

import { cp, mkdir, readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import * as fileUtils from './fileUtils';
import * as pathUtils from './pathUtils';
import { setExecutePermissions } from './permissions';

/**
 * Common patterns used in text replacements
 */
export const ReplacementPatterns = {
  GRADLE_RIO_MARKER: '###GRADLERIOREPLACE###',
  ROBOT_CLASS_MARKER: '###ROBOTCLASSREPLACE###',
  JAVA_PACKAGE_PATTERN: 'org\\.wpilib\\.(?:examples|templates)\\..+?(?=;|\\.)',
};

/**
 * Common vendordep file names
 */
export const VendorDepFiles = {
  COMMANDSV2: 'CommandsV2.json',
  ROMI: 'RomiVendordep.json',
  XRP: 'XRPVendordep.json',
  COMMANDSV3: 'CommandsV3.json',
  COMMANDSV2_OLD: 'WPILibNewCommands.json',
};

export const ComponentPackages = {
  APRILTAG: 'apriltag',
  COMMANDSV2: 'commands2',
  CSCORE: 'cscore',
  ROMI: 'romi',
  SIM: 'sim',
  XRP: 'xrp',
};

export const allComponents = ['all', 'apriltag', 'commands2', 'cscore', 'romi', 'sim', 'xrp'];

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
  return await glob(pattern, {
    cwd: baseDir,
    nodir: true,
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
  grRoot: string,
  python?: boolean
): Promise<boolean> {
  try {
    // Copy gradle files
    await cp(fromGradleFolder, toFolder, {
      filter: (cf) => gradleCopyFilter(cf, fromGradleFolder),
      recursive: true,
    });
    if (python) return true; //RobotPy does not use build.gradle, skip over shared folder
    // Copy shared gradle files
    await cp(path.join(grRoot, 'shared'), toFolder, {
      filter: (cf) => gradleCopyFilter(cf, fromGradleFolder),
      recursive: true,
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

export async function updateRobotPyVersion(
  pyprojectPath: string,
  robotpyVersion: string
): Promise<boolean> {
  try {
    let file = await readFile(pyprojectPath, 'utf-8');
    const versionString = 'robotpy_version = ';
    file = file.replace(versionString, versionString + '"' + robotpyVersion + '"');
    await writeFile(pyprojectPath, file, 'utf8');
    return true;
  } catch (err) {
    logger.log('Error updating robotpy version');
    return false;
  }
}

export async function setupComponents(vendors: string[], toFolder: string) {
  const components: string[] = [];
  for (const v of vendors) {
    if (v === 'commandsv2') components.push(ComponentPackages.COMMANDSV2);
    else if (v === 'apriltag') components.push(ComponentPackages.APRILTAG);
    else if (v === 'cscore') components.push(ComponentPackages.CSCORE);
    else if (v === 'romi') components.push(ComponentPackages.ROMI);
    else if (v === 'sim') components.push(ComponentPackages.SIM);
    else if (v === 'xrp') components.push(ComponentPackages.XRP);
  }
  pathUtils.copyComponets(components, toFolder);
}

export function isComponent(pkg: string) {
  return allComponents.includes(pkg);
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
    await mkdir(deployDir, { recursive: true });

    const hintKey = isJava ? 'generateJavaDeployHint' : 'generateCppDeployHint';
    const hintText = isJava
      ? `Files placed in this directory will be deployed to the Systemcore into the
'deploy' directory in the home folder. Use the 'Filesystem.getDeployDirectory' wpilib function
to get a proper path relative to the deploy directory.`
      : `Files placed in this directory will be deployed to the Systemcore into the
'deploy' directory in the home folder. Use the 'wpi::filesystem::GetDeployDirectory'
function from the 'wpi/system/Filesystem.hpp' header to get a proper path relative to the deploy
directory.`;

    await writeFile(path.join(deployDir, 'example.txt'), i18n('generator', [hintKey, hintText]));

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
  vendordeps: string[] = []
): Promise<boolean> {
  try {
    const vendorDir = path.join(toFolder, 'vendordeps');
    await mkdir(vendorDir, { recursive: true });

    // Add extra vendordeps
    for (const vendordep of vendordeps) {
      if (vendordep === 'romi') {
        await pathUtils.copyVendorDep(resourcesFolder, VendorDepFiles.ROMI, vendorDir);
      } else if (vendordep === 'xrp') {
        await pathUtils.copyVendorDep(resourcesFolder, VendorDepFiles.XRP, vendorDir);
      } else if (vendordep === 'commandsv2') {
        await pathUtils.copyVendorDep(resourcesFolder, VendorDepFiles.COMMANDSV2, vendorDir);
      } else if (vendordep === 'commandsv3') {
        await pathUtils.copyVendorDep(resourcesFolder, VendorDepFiles.COMMANDSV3, vendorDir);
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
  return (await readFile(grVersionFile, 'utf8')).trim();
}
