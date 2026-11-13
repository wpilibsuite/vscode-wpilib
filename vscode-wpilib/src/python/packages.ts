'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { IExecuteAPI } from '../api';
import { logger } from '../logger';
import { getWPILibYear } from '../shared/utilitiesapi';
import { getProjectPython, uvFindLinksOption, uvPythonOption } from '../pythondetector';
import { quoteShellArg } from '../utilities';

const execFileAsync = promisify(cp.execFile);

const queryTimeoutMs = 30000;

const uvOfflineExitCode = 2;

async function runUv(
  args: string,
  name: string,
  workspace: vscode.WorkspaceFolder,
  executeApi: IExecuteAPI
): Promise<number> {
  args += uvPythonOption(workspace.uri.fsPath) + uvFindLinksOption();
  const code = await executeApi.executeCommand(`uv ${args}`, name, workspace.uri.fsPath, workspace);
  if (code === uvOfflineExitCode) {
    return executeApi.executeCommand(`uv ${args} --offline`, name, workspace.uri.fsPath, workspace);
  }
  return code;
}

export async function installPackage(
  pkg: string,
  workspace: vscode.WorkspaceFolder,
  executeApi: IExecuteAPI,
  version?: string
): Promise<boolean> {
  const spec = version ? `${pkg}==${version}` : pkg;
  const code = await runUv(
    `pip install ${spec} --prerelease=allow`,
    'UV Install Requirement',
    workspace,
    executeApi
  );
  return code === 0;
}

export async function installWheel(
  wheelPath: string,
  workspace: vscode.WorkspaceFolder,
  executeApi: IExecuteAPI
): Promise<boolean> {
  const code = await executeApi.executeCommand(
    `uv pip install ${quoteShellArg(wheelPath)} --offline --prerelease=allow` +
      uvPythonOption(workspace.uri.fsPath) +
      uvFindLinksOption(),
    'Offline Install Python Package',
    workspace.uri.fsPath,
    workspace
  );
  return code === 0;
}

export async function getInstalledVersion(
  pkg: string,
  workspace: string
): Promise<string | undefined> {
  try {
    const args = ['pip', 'show', pkg];
    const python = getProjectPython(workspace);
    if (python) {
      args.push('--python', python);
    }
    const out = await execFileAsync('uv', args, {
      cwd: workspace,
      encoding: 'utf8',
      timeout: queryTimeoutMs,
    });
    const match = /^Version: *(\S+)/m.exec(out.stdout);
    return match ? match[1] : undefined;
  } catch {
    logger.log(`Error getting installed version of ${pkg}`);
    return undefined;
  }
}

const versionCacheMs = 5 * 60 * 1000;
const versionCache = new Map<string, { time: number; versions: string[] }>();

function parseIndexVersions(output: string): string[] {
  const m = /Available versions:\s*(.*)/.exec(output);
  return m
    ? m[1]
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v)
    : [];
}

export async function getAvailableVersions(
  pkg: string,
  workspace: string,
  cachedOnly = false
): Promise<string[]> {
  const cached = versionCache.get(pkg);
  if (cached && Date.now() - cached.time < versionCacheMs) {
    return cached.versions;
  }
  if (cachedOnly) {
    return cached?.versions ?? [];
  }
  try {
    const year = getWPILibYear().substring(0, 4);
    const options = {
      cwd: workspace,
      encoding: 'utf8' as const,
      timeout: queryTimeoutMs,
    };
    const [stableOut, preOut] = await Promise.all([
      execFileAsync('uvx', ['pip', 'index', 'versions', pkg], options),
      execFileAsync('uvx', ['pip', 'index', 'versions', pkg, '--pre'], options),
    ]);
    const stable = new Set(parseIndexVersions(stableOut.stdout));
    const versions = parseIndexVersions(preOut.stdout)
      .filter((v) => v.startsWith(year))
      .map((v) => (stable.has(v) ? v : v + ' (prerelease)'));
    versionCache.set(pkg, { time: Date.now(), versions });
    return versions;
  } catch {
    logger.log(
      'Unable to get package versions, either the package is not published, or it is a component'
    );
    return [];
  }
}

export function parseWheelName(wheelPath: string): { name: string; version: string } | undefined {
  const parts = path.basename(wheelPath, path.extname(wheelPath)).split('-');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return undefined;
  }
  return { name: parts[0].replace(/_/g, '-'), version: parts[1] };
}
