'use strict';

import { cp, readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger';
import { componentForVendorDep } from '../shared/components';
import * as pathUtils from '../shared/pathUtils';
import * as genUtils from '../shared/projectGeneratorUtils';
import { enableComponents, getPyProjectPath, setRobotPyVersion } from '../shared/pyproject';
import { getWPILibYear } from '../shared/utilitiesapi';
import { getRobotPyVersion } from '../pythondetector';
import { getAvailableVersions } from './packages';

async function resolveRobotPyVersion(cwd: string): Promise<string | undefined> {
  const year = getWPILibYear().substring(0, 4);
  const installed = await getRobotPyVersion();
  if (installed?.startsWith(year)) {
    return installed;
  }
  const available = await getAvailableVersions('robotpy', cwd);
  if (available.length > 0) {
    return available[0].replace(' (prerelease)', '');
  }
  return installed;
}

export async function generateCopyPython(
  fromTemplateFolder: string,
  fromTemplateTestFolder: string | undefined,
  fromGradleFolder: string,
  toFolder: string,
  vendordeps: string[]
): Promise<boolean> {
  try {
    // Check if destination folder is empty
    if (!(await pathUtils.isFolderEmpty(toFolder))) {
      logger.warn('Destination folder is not empty');
      return false;
    }

    const testPath = path.join(toFolder, 'tests');
    const pyprojectPath = getPyProjectPath(toFolder);

    // Copy template folders
    await cp(fromTemplateFolder, toFolder, { recursive: true });
    if (fromTemplateTestFolder !== undefined) {
      await cp(fromTemplateTestFolder, testPath, { recursive: true });
    }

    let existingPyProject: string | undefined;
    try {
      existingPyProject = await readFile(pyprojectPath, 'utf8');
    } catch {
      existingPyProject = undefined;
    }

    await genUtils.copyGradleBase(fromGradleFolder, toFolder);
    if (existingPyProject !== undefined) {
      await writeFile(pyprojectPath, existingPyProject, 'utf8');
    }

    // Update robotpy version in the pyproject.toml file of the new project
    const robotpyVersion = await resolveRobotPyVersion(toFolder);
    if (robotpyVersion) {
      await setRobotPyVersion(pyprojectPath, robotpyVersion);
    } else if (existingPyProject === undefined) {
      logger.warn('Could not determine a RobotPy version for the new project');
      await setRobotPyVersion(pyprojectPath, '');
    }

    const components = vendordeps
      .map((v) => componentForVendorDep(v))
      .filter((c): c is string => c !== undefined);
    await enableComponents(toFolder, components);

    return true;
  } catch (e) {
    logger.error('Python project creation failure', e);
    return false;
  }
}
