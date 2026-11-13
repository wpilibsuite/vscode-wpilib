'use strict';

import * as cp from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { logger } from './logger';
import { getIsWindows, quoteShellArg } from './utilities';
import * as vscode from 'vscode';
import { IExecuteAPI } from './api';
import { getPyProjectFile } from './shared/pyproject';
import { getWPILibHomeDir } from './shared/utilitiesapi';

const execFileAsync = promisify(cp.execFile);

export function getProjectPython(root: string): string | undefined {
  const isWindows = getIsWindows();
  const candidates = [
    path.join(root, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python'),
    vscode.workspace
      .getConfiguration('python', vscode.Uri.file(root))
      .get<string>('defaultInterpreterPath'),
    path.join(getWPILibHomeDir(), 'python', isWindows ? 'python.exe' : 'bin/python3'),
  ];
  return candidates.find((p) => p && path.isAbsolute(p) && existsSync(p));
}

export function uvPythonOption(root: string): string {
  const python = getProjectPython(root);
  return python ? ` --python ${quoteShellArg(python)}` : '';
}

export function getWheelDir(): string {
  return path.join(getWPILibHomeDir(), 'robotpy');
}

export function uvFindLinksOption(): string {
  const wheelDir = getWheelDir();
  return existsSync(wheelDir) ? ` --find-links ${quoteShellArg(wheelDir)}` : '';
}

export async function robotpyRun(
  args: string,
  rootDir: string,
  workspace: vscode.WorkspaceFolder,
  name: string,
  executeApi: IExecuteAPI
): Promise<number> {
  const command = `uv run --no-project${uvPythonOption(rootDir)} robotpy ${args}`;
  return executeApi.executeCommand(command, name, rootDir, workspace);
}

export async function getPythonVersion(): Promise<string | undefined> {
  try {
    const version = cp.execSync('python --version').toString();
    const match: RegExpMatchArray | null = version.match(/\d+/g);
    const versionNum = match?.join('.');
    return versionNum;
  } catch (error) {
    logger.log('Error getting python version');
  }
  return undefined;
}

export async function getRobotPyVersion(wp?: string): Promise<string | undefined> {
  try {
    if (wp) {
      const args = ['pip', 'show', 'robotpy'];
      const python = getProjectPython(wp);
      if (python) {
        args.push('--python', python);
      }
      const { stdout } = await execFileAsync('uv', args, { cwd: wp, encoding: 'utf8' });
      const match = stdout.match(/^Version: *(\S+)/m);
      return match ? match[1] : undefined;
    }
    let cmd = 'pip index versions --pre robotpy';
    if (getIsWindows()) {
      cmd = 'py -3 -m ' + cmd;
    }
    const out = cp.execSync(cmd, { encoding: 'utf8' });
    const match = out.match(/INSTALLED: *(\S+)/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

export async function getDeclaredRobotPyVersion(wp: string): Promise<string | undefined> {
  const project = await getPyProjectFile(wp);
  const version = project?.tool.robotpy.robotpy_version;
  return typeof version === 'string' && version.trim() ? version.trim() : undefined;
}

export async function setupVenv(
  executeApi: IExecuteAPI,
  wp: vscode.WorkspaceFolder
): Promise<boolean> {
  try {
    let pyVer = await getPythonVersion();
    if (pyVer) {
      pyVer = pyVer.substring(0, 4);
    }
    const venvArgs = `--python ${pyVer} --allow-existing --seed${uvFindLinksOption()}`;
    let cmd = `uv venv ${venvArgs}`;
    let num = await executeApi.executeCommand(cmd, 'Set Up Venv', wp.uri.fsPath, wp);
    if (num !== 0) {
      cmd = `uv venv ${venvArgs} --offline`;
      num = await executeApi.executeCommand(cmd, 'Set Up Venv Offline', wp.uri.fsPath, wp);
    }
    const robotpyver = await getDeclaredRobotPyVersion(wp.uri.fsPath);
    if (robotpyver) {
      cmd = `uv pip install robotpy==${robotpyver} --prerelease=allow`;
    } else {
      cmd = 'uv pip install robotpy --prerelease=allow';
    }
    cmd += uvPythonOption(wp.uri.fsPath) + uvFindLinksOption();
    let n = await executeApi.executeCommand(cmd, 'Install RobotPy', wp.uri.fsPath, wp);
    // If exits with code 2, the project is offline, add offline tag and run the command again
    if (n === 2) {
      n = await executeApi.executeCommand(cmd + ' --offline', 'Install RobotPy', wp.uri.fsPath, wp);
    }
    return n === 0;
  } catch {
    logger.log('Error setting up venv');
    return false;
  }
}

async function checkPythonPath(path: string | undefined, source: string) {
  if (path) {
    try {
      const pyVersion = await getPythonVersion();
      const regexp = /1[2-6]/g;
      const version = pyVersion?.match(regexp);
      if (version && version.toString() >= '11') {
        logger.log(`Found ${source} Version: ${pyVersion} at ${path}`);
        return true;
      } else {
        logger.info(`Bad Python version ${pyVersion} at ${path} from ${source}`);
      }
    } catch (err) {
      logger.log(`Error loading python from ${source}, skipping`, err);
    }
  }
  return false;
}

export async function findPythonPath(): Promise<string | undefined> {
  let cmd = 'python';
  if (getIsWindows()) {
    cmd = 'where ' + cmd;
  } else {
    cmd = 'which ' + cmd;
  }
  try {
    const vscodePythonPath = cp.execSync(cmd, { encoding: 'utf-8' });
    if (await checkPythonPath(vscodePythonPath, 'Execute Command Output')) {
      return vscodePythonPath;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
