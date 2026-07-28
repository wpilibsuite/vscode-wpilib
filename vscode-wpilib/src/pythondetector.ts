'use strict';

import * as cp from 'child_process';
import { logger } from './logger';
import { getIsWindows } from './utilities';
import * as vscode from 'vscode';
import { IExecuteAPI } from './api';
import { updateRobotPyVersion } from './shared/vendorlibrariesbase';

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

export async function getRobotPyVersion(wp?: string): Promise<string> {
  try {
    let regexp = /Version: .*/;
    let cmd = 'pip show robotpy';
    if (wp) {
      const out1 = cp.execSync('uv ' + cmd, { cwd: wp, encoding: 'utf8' });
      const match1: RegExpMatchArray | null = out1.match(regexp);
      if (match1) {
        const v = match1.toLocaleString().substring(9);
        await updateRobotPyVersion(v, wp);
        return v;
      }
    } else {
      cmd = 'pip index versions --pre robotpy';
      if (getIsWindows()) cmd = 'py -3 -m ' + cmd;
      const out2 = cp.execSync(cmd, { encoding: 'utf8' });
      regexp = /INSTALLED: .*/;
      const match2: RegExpMatchArray | null = out2.match(regexp);
      if (match2) return match2.toLocaleString().substring(11);
    }
    return 'version undefined';
  } catch (err) {
    return 'version undefined';
  }
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
    let cmd = `uv venv --python ${pyVer} --allow-existing --seed --refresh`;
    let num = await executeApi.executeCommand(cmd, 'Set Up Venv', wp.uri.fsPath, wp);
    if (num !== 0) {
      cmd = `uv venv --python ${pyVer} --allow-existing --seed --offline`;
      num = await executeApi.executeCommand(cmd, 'Set Up Venv Offline', wp.uri.fsPath, wp);
    }
    const robotpyver = await getRobotPyVersion(wp.uri.fsPath);
    if (robotpyver === 'version undefined') cmd = 'uv pip install robotpy --prerelease=allow';
    else cmd = `uv pip install robotpy==${robotpyver} --prerelease=allow`;
    let n = await executeApi.executeCommand(cmd, 'Install RobotPy', wp.uri.fsPath, wp);
    // If exits with code 2, the project is offline, add offline tag and run the command again
    if (n === 2) {
      n = await executeApi.executeCommand(cmd + ' --offline', 'Install RobotPy', wp.uri.fsPath, wp);
    }
    if (n === 0) return Promise.resolve(true);
    else return Promise.resolve(false);
  } catch {
    logger.log('Error setting up venv');
    return Promise.resolve(false);
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
  if (getIsWindows()) cmd = 'where ' + cmd;
  else cmd = 'which ' + cmd;
  const vscodePythonPath = cp.execSync(cmd, { encoding: 'utf-8' });
  if (await checkPythonPath(vscodePythonPath, 'Execute Command Output')) {
    return vscodePythonPath;
  }
  return undefined;
}
