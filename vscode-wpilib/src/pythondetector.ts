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

const minimumPythonVersion = { major: 3, minor: 11 };

export interface IPythonVersion {
  full: string;
  major: number;
  minor: number;
}

export async function getPythonVersion(pythonPath = 'python'): Promise<IPythonVersion | undefined> {
  try {
    const { stdout, stderr } = await execFileAsync(pythonPath, ['--version'], {
      encoding: 'utf8',
    });
    const match = /(\d+)\.(\d+)(?:\.\d+)?/.exec(stdout || stderr);
    if (!match) {
      logger.log(`Could not read a Python version from ${pythonPath}`);
      return undefined;
    }
    return {
      full: match[0],
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
    };
  } catch {
    logger.log(`Error getting python version from ${pythonPath}`);
    return undefined;
  }
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
    const pythonPath = await findPythonPath();
    if (!pythonPath) {
      logger.log('No suitable Python found on the PATH, letting uv pick an interpreter');
    }
    const pythonOption = pythonPath ? ` --python ${quoteShellArg(pythonPath)}` : '';
    const venvArgs = `--allow-existing --seed${pythonOption}${uvFindLinksOption()}`;
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

async function checkPythonPath(pythonPath: string, source: string): Promise<boolean> {
  const version = await getPythonVersion(pythonPath);
  if (!version) {
    logger.info(`Could not read a Python version at ${pythonPath} from ${source}`);
    return false;
  }
  if (
    version.major < minimumPythonVersion.major ||
    (version.major === minimumPythonVersion.major && version.minor < minimumPythonVersion.minor)
  ) {
    logger.info(
      `Bad Python version ${version.full} at ${pythonPath} from ${source}, ` +
        `${minimumPythonVersion.major}.${minimumPythonVersion.minor} or newer is required`
    );
    return false;
  }
  logger.log(`Found ${source} Version: ${version.full} at ${pythonPath}`);
  return true;
}

export async function findPythonPath(): Promise<string | undefined> {
  const locator = getIsWindows() ? 'where' : 'which';
  for (const name of ['python3', 'python']) {
    let output: string;
    try {
      output = cp.execSync(`${locator} ${name}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      continue;
    }
    const candidates = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '');
    for (const candidate of candidates) {
      if (await checkPythonPath(candidate, `${locator} ${name}`)) {
        return candidate;
      }
    }
  }
  return undefined;
}
