'use strict';

import { access, mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import { allComponents } from './projectGeneratorUtils';
import * as path from 'path';
import { logger } from '../logger';
import { getWPILibHomeDir, getWPILibYear } from './utilitiesapi';
import * as cp from 'child_process';
import * as TOML from 'toml';
import * as vscode from 'vscode';
import { IExecuteAPI } from '../api';

export interface IJsonDependency {
  name: string;
  version: string;
  uuid: string;
  jsonUrl: string;
  fileName: string;
  conflictsWith?: IJsonConflicts[];
  requires?: IJsonRequires[];
}

export interface IJsonRequires {
  uuid: string;
  errorMessage: string;
  offlineFileName: string;
  onlineUrl: string;
}

export interface IJsonConflicts {
  uuid: string;
  errorMessage: string;
  offlineFileName: string;
}

export interface IPyProject {
  tool: {
    robotpy: {
      robotpy_version: string;
      components: string[];
      requires: IRequires[];
    };
  };
}

export interface IRequires {
  name: string;
  specifier?: string;
  version?: string;
  availableVersions: string[];
}

export function isJsonDependency(arg: unknown): arg is IJsonDependency {
  const jsonDep = arg as IJsonDependency;

  return (
    jsonDep.jsonUrl !== undefined &&
    jsonDep.name !== undefined &&
    jsonDep.uuid !== undefined &&
    jsonDep.version !== undefined
  );
}

export async function findForUUIDs(uuid: string[]): Promise<IJsonDependency[]> {
  const homeDirDeps = await getHomeDirDeps();
  const foundDeps = homeDirDeps.filter((value) => {
    return uuid.indexOf(value.uuid) >= 0;
  });
  return foundDeps;
}

export async function installDependency(
  dep: IJsonDependency,
  url: string,
  override: boolean
): Promise<boolean> {
  try {
    try {
      await access(url);
    } catch {
      // File doesn't exist, directly write file
      await mkdir(url, { recursive: true });
      await writeFile(path.join(url, dep.fileName), JSON.stringify(dep, null, 4));
      return true;
    }
    const files = await readdir(url);

    for (const file of files) {
      const fullPath = path.join(url, file);
      const result = await parseVendordepJson(fullPath);
      if (result?.uuid === dep.uuid) {
        if (override) {
          await unlink(fullPath);
          break;
        } else {
          return false;
        }
      }
    }

    await writeFile(path.join(url, dep.fileName), JSON.stringify(dep, null, 4));
    return true;
  } catch (error) {
    logger.error(`Failed to install dependency ${dep.name}:`, error);
    return false;
  }
}

export async function installNewRequirement(
  pkg: string,
  workspace: vscode.WorkspaceFolder,
  executeApi: IExecuteAPI,
  version?: string
): Promise<IRequires | undefined> {
  try {
    let cmd = 'uv pip install ' + pkg + ' --prerelease=allow';
    if (version) {
      if (version.substring(4) !== getWPILibYear()) return;
      cmd = `uv pip install ${pkg}==${version} --prerelease=allow`;
    }
    //Make sure that this is a valid package name, if there's an error installing, should go to the catch
    let n = await executeApi.executeCommand(
      cmd,
      'UV Install Requirement',
      path.join(workspace.uri.fsPath, '.venv'),
      workspace
    );
    // If exits with code 2, the project is offline, add offline tag and run the command again
    if (n === 2)
      n = await executeApi.executeCommand(
        cmd + ' --offline',
        'UV Install Requirement',
        path.join(workspace.uri.fsPath, '.venv'),
        workspace
      );
    if (n === 0) {
      const versions = getVersions(pkg, workspace.uri.fsPath);
      let installedVersion = await getInstalledVersion(pkg, workspace.uri.fsPath);
      if (!installedVersion) installedVersion = versions[0]; //get the installed version or the latest available version
      return { name: pkg, specifier: '~=', version: installedVersion, availableVersions: versions };
    }
    return undefined;
  } catch {
    //logger.log('Error installing new requirement, is the package name correct?');
    vscode.window.showErrorMessage(
      'Error installing new requirement, is the package name correct?',
      pkg
    );
    return undefined;
  }
}

export async function addPythonDep(
  components: string[],
  requires: IRequires[],
  workspace: string
): Promise<boolean> {
  try {
    const dir = path.join(workspace, 'pyproject.toml');
    let file = (await readFile(dir)).toString();
    const componentPackages = allComponents;
    const installedComponents = await getComponents(workspace);
    const installedRequirements = await getVendorPackageNames(workspace);
    let toAdd = 'components = [';
    let added = false;
    for (const a of componentPackages) {
      added = false;
      for (const c of components) {
        if (c === a) {
          toAdd += '\n\t "' + c + '",';
          added = true;
        }
      }
      if (!added) {
        if (installedComponents.indexOf(a) !== -1) toAdd += '\n\t "' + a + '",';
        else toAdd += '\n\t#  "' + a + '",';
      }
    }
    let toReplace = new RegExp(`(${'components = ['})([\\s\\S]*?)(${']'})`, 'g');
    file = file.replace(toReplace, toAdd + '\n]');
    toAdd = 'requires = [';
    for (const r of requires) {
      if (installedRequirements.indexOf(r.name) === -1) {
        if (r.version) {
          if (r.version.indexOf(' (prerelease)') !== -1)
            toAdd =
              toAdd + '"' + r.name + '~=' + r.version.substring(0, r.version.indexOf(' (')) + '", ';
          else toAdd = toAdd + '"' + r.name + '~=' + r.version + '", ';
        } else toAdd = toAdd + '"' + r.name + '", ';
      }
    }
    toReplace = /requires = \[/g;
    file = file.replace(toReplace, toAdd);
    await writeFile(dir, file);
    return true;
  } catch {
    logger.log('Error copying python components, add manually');
    return false;
  }
}

export async function updateRobotPyVersion(ver: string, workspace: string) {
  let f = await readFile(path.join(workspace, 'pyproject.toml'), 'utf8');
  const robotPy = await getPyProjectFile(workspace);
  if (robotPy?.tool.robotpy && robotPy.tool.robotpy.robotpy_version !== ver) {
    const robotPyIndex = f.indexOf('robotpy_version');
    const robotPyLength = ('robotpy_version = ""' + robotPy.tool.robotpy.robotpy_version).length;
    const replace = f.substring(robotPyIndex, robotPyLength + robotPyIndex);
    f = f.replace(replace, `robotpy_version = "${ver}"`);
    await writeFile(path.join(workspace, 'pyproject.toml'), f);
  }
}

export async function updateVersion(req: IRequires, workspace: string): Promise<boolean> {
  try {
    if (req.version) {
      const dir = path.join(workspace, 'pyproject.toml');
      const file = await readFile(dir, 'utf8');
      const toReplace = file.indexOf(req.name);
      const robotpy = await getPyProjectFile(workspace);
      if (robotpy?.tool.robotpy.requires) {
        let oldReq = '';
        for (const r of robotpy.tool.robotpy.requires) {
          if (r.name === req.name) {
            if (r.version && r.specifier) {
              oldReq = r.name + r.specifier + r.version;
            } else {
              oldReq = r.name;
            }
          }
        }
        if (!req.specifier) req.specifier = (await parseRequirement(oldReq)).specifier;
        let replace = req.name;
        let version = req.version;
        if (req.version) {
          if (version.indexOf(' (prerelease)') !== -1) {
            version = req.version.substring(0, req.version.indexOf(' (prerelease)'));
          }
          replace = replace + req.specifier + version;
        }
        await writeFile(
          dir,
          file.substring(0, toReplace) + replace + file.substring(toReplace + oldReq.length),
          'utf8'
        );
        try {
          cp.execSync(`uv pip install ${req.name}==${version} --prerelease=allow`, {
            cwd: workspace,
            encoding: 'utf8',
          });
          return true;
        } catch (err) {
          logger.log('Error installing new package version');
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function removePythonDep(
  components: string[],
  requires: IRequires[],
  workspace: string
): Promise<boolean> {
  try {
    const dir = path.join(workspace, 'pyproject.toml');
    let file = await readFile(dir, 'utf8');
    const pyproject = (await getPyProjectFile(workspace)) as IPyProject;
    const installedComponents = await getComponents(workspace);
    const installedRequirements = pyproject.tool.robotpy.requires;
    for (const c of components) {
      if (installedComponents.indexOf(c) !== -1) {
        file = file.substring(0, file.indexOf(c) - 2) + '# ' + file.substring(file.indexOf(c) - 2);
      }
    }
    for (const r of requires) {
      for (let i = 0; i < installedRequirements.length; i++) {
        const reqDep = installedRequirements[i];
        let iString = reqDep.name;
        if (reqDep.specifier) iString += reqDep.specifier + reqDep.version;
        if (reqDep.name === r.name) {
          let endIndex = file.indexOf(iString) + iString.length + 2;
          if (file.substring(endIndex).indexOf(']') === -1) endIndex = endIndex - 1;
          file = file.substring(0, file.indexOf(iString) - 1) + file.substring(endIndex);
        }
      }
    }
    await writeFile(dir, file);
    return true;
  } catch {
    logger.log('Error removing python dependency');
    return false;
  }
}

export async function getPyProjectFile(workspace: string): Promise<IPyProject | undefined> {
  try {
    const f = await readFile(path.join(workspace, 'pyproject.toml'), 'utf-8');
    const project = TOML.parse(f) as unknown as IPyProject;
    const requires = project.tool.robotpy.requires.toLocaleString();
    const regexp = /[a-z -]+(?=[=><!~*]{1,2})[><!~*=]{1,2}(?<=[><!~*=]{1})\d[\d . a-z]+/g;
    const req = requires.match(regexp) as string[];
    const ret: IRequires[] = [];
    if (req) {
      for (const s of req) {
        ret.push(await parseRequirement(s));
      }
      project.tool.robotpy.requires = ret;
    }
    return project;
  } catch {
    logger.log('Error getting PyProject file');
    return undefined;
  }
}

export async function parseRequirement(requires: string): Promise<IRequires> {
  let nameExp = /[a-z -]+(?=[=><!~*]{1,2})/;
  const specifierExp = /[><!~*=]{1,2}/g;
  const versionExp = /(?<=[><!~*=]{1})[\d . a-z]+/;
  if (requires.match(specifierExp)) {
    const n = requires.match(nameExp)?.toString() as string;
    const s = requires.match(specifierExp)?.toString() as string;
    const v = requires.match(versionExp)?.toString() as string;
    return { name: n, specifier: s, version: v, availableVersions: [] };
  }
  nameExp = /[a-z -]+/;
  const n = requires.match(nameExp)?.toString() as string;
  return { name: n, availableVersions: [] };
}

export async function getComponents(workspace: string) {
  const components = (await getPyProjectFile(workspace))?.tool.robotpy.components as string[];
  return components;
}

export async function getVendorPackageNames(workspace: string) {
  const ret: string[] = [];
  const projectFile = await getPyProjectFile(workspace);
  if (!projectFile) return ret;
  const rawRequires = projectFile.tool.robotpy.requires;
  for (const r of rawRequires) {
    ret.push(r.name);
  }
  return ret;
}

export async function getPythonDeps(workspace: string): Promise<string[]> {
  try {
    const file = await getPyProjectFile(workspace);
    if (file) {
      const ret: string[] = file.tool.robotpy.components;
      ret.push(...(await getVendorPackageNames(workspace)));
      return ret;
    } else {
      return [];
    }
  } catch {
    logger.log('Error parsing toml file');
    return [];
  }
}

export async function getRequires(file: IPyProject): Promise<IRequires[]> {
  return file.tool.robotpy.requires;
}

export async function getInstalledVersion(
  pkg: string,
  workspace: string
): Promise<string | undefined> {
  try {
    const regexp = /Version: .*/;
    const reqs = await getRequires((await getPyProjectFile(workspace)) as unknown as IPyProject);
    for (const r of reqs) {
      if (r.name === pkg) {
        return r.version;
      }
    }
    const cmd = 'uv pip show ' + pkg;
    const out = cp.execSync(cmd, { cwd: workspace, encoding: 'utf8' });
    const match: RegExpMatchArray | null = out.match(regexp);
    if (match) return match.toString().substring(9);
    return undefined;
  } catch {
    logger.log('Error getting installed version');
    return undefined;
  }
}

export function getVersions(pkg: string, workspace: string): string[] {
  try {
    const cmd = 'uvx pip index versions ' + pkg;
    const year = getWPILibYear().substring(0, 4);
    const currentVersions = cp.execSync(cmd, { cwd: workspace, encoding: 'utf8' });
    const regexp = /\d[^,\r\n]+(?=,)/g;
    const notPre = currentVersions.match(regexp) as string[];
    const pre = cp
      .execSync(cmd + ' --pre', { cwd: workspace, encoding: 'utf8' })
      .match(regexp) as string[];
    const match: string[] = [];
    for (const p of pre) {
      for (const c of notPre) {
        if (p === c && c.indexOf(year) !== -1) {
          match.push(c);
          continue;
        }
      }
      if (match.indexOf(p) === -1 && p.indexOf(year) !== -1) match.push(p + ' (prerelease)');
    }
    return match;
  } catch {
    // Unable to get versions, either the package isn't installed, or it is a component
    logger.log(
      'Unable to get package versions, either the package is not installed, or it is a component'
    );
    return [];
  }
}

export function getHomeDirDeps(): Promise<IJsonDependency[]> {
  return getDependencies(path.join(getWPILibHomeDir(), 'vendordeps'));
}

export async function parseVendordepJson(file: string): Promise<IJsonDependency | undefined> {
  try {
    const jsonContents = await readFile(file, 'utf8');
    const dep = JSON.parse(jsonContents);

    if (isJsonDependency(dep)) {
      return dep;
    }

    return undefined;
  } catch (err) {
    logger.warn('JSON parse error', err);
    return undefined;
  }
}

export async function getDependencies(dir: string): Promise<IJsonDependency[]> {
  try {
    const files = await readdir(dir);

    const promises: Promise<IJsonDependency | undefined>[] = [];

    for (const file of files) {
      promises.push(parseVendordepJson(path.join(dir, file)));
    }

    const results = await Promise.all(promises);

    return results.filter((x) => x !== undefined) as IJsonDependency[];
  } catch (err) {
    return [];
  }
}

export async function loadFileFromUrl(url: string): Promise<IJsonDependency> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const json = await response.json();
      if (isJsonDependency(json)) {
        return json;
      } else {
        throw new Error('Incorrect JSON format');
      }
    } else {
      throw new Error(`Bad status ${response.status}`);
    }
  } catch (error) {
    logger.error(`Failed to load file from URL: ${url}`, error);
    throw error;
  }
}
