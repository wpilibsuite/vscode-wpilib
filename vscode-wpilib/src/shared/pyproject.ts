'use strict';

import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import * as TOML from 'toml';
import { logger } from '../logger';
import { allComponents } from './components';

export const pyprojectFileName = 'pyproject.toml';

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

export function getPyProjectPath(workspace: string): string {
  return path.join(workspace, pyprojectFileName);
}

export function stripPrerelease(version: string): string {
  const index = version.indexOf(' (prerelease)');
  return index === -1 ? version : version.substring(0, index);
}

const requirementRegex =
  /^\s*([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)\s*(?:\[[^\]]*\])?\s*(?:(===|~=|==|!=|<=|>=|<|>)\s*([^\s,;]+))?/;

export function parseRequirement(requires: string): IRequires {
  const m = requirementRegex.exec(requires);
  if (!m) {
    return { name: '', availableVersions: [] };
  }
  if (m[2] && m[3]) {
    return { name: m[1], specifier: m[2], version: m[3], availableVersions: [] };
  }
  return { name: m[1], availableVersions: [] };
}

export function formatRequirement(req: IRequires): string {
  if (req.version) {
    return `"${req.name}${req.specifier ?? '~='}${stripPrerelease(req.version)}"`;
  }
  return `"${req.name}"`;
}

export async function getPyProjectFile(workspace: string): Promise<IPyProject | undefined> {
  try {
    const f = await readFile(getPyProjectPath(workspace), 'utf8');
    const project = TOML.parse(f) as unknown as IPyProject;
    const robotpy = project.tool.robotpy;
    robotpy.components = Array.isArray(robotpy.components) ? robotpy.components : [];
    const rawRequires: unknown[] = Array.isArray(robotpy.requires) ? robotpy.requires : [];
    robotpy.requires = rawRequires
      .filter((r): r is string => typeof r === 'string')
      .map((r) => parseRequirement(r))
      .filter((r) => r.name !== '');
    return project;
  } catch {
    logger.log('Error getting PyProject file');
    return undefined;
  }
}

export async function getComponents(workspace: string): Promise<string[]> {
  return (await getPyProjectFile(workspace))?.tool.robotpy.components ?? [];
}

export async function getVendorPackageNames(workspace: string): Promise<string[]> {
  const projectFile = await getPyProjectFile(workspace);
  return projectFile ? projectFile.tool.robotpy.requires.map((r) => r.name) : [];
}

export async function getRequirements(workspace: string): Promise<IRequires[]> {
  return (await getPyProjectFile(workspace))?.tool.robotpy.requires ?? [];
}

export async function getPythonDeps(workspace: string): Promise<string[]> {
  const file = await getPyProjectFile(workspace);
  if (!file) {
    return [];
  }
  return [...file.tool.robotpy.components, ...file.tool.robotpy.requires.map((r) => r.name)];
}

interface IStringItem {
  start: number;
  end: number;
  value: string;
}

interface IStringArray {
  open: number;
  close: number;
  items: IStringItem[];
}


export function findStringArray(file: string, key: string): IStringArray | undefined {
  const header = /^[ \t]*\[[ \t]*tool\.robotpy[ \t]*\][ \t]*(?:#.*)?$/m.exec(file);
  if (!header) {
    return undefined;
  }
  const tableStart = header.index + header[0].length;
  const nextHeader = /^[ \t]*\[/m.exec(file.substring(tableStart));
  const tableEnd = nextHeader ? tableStart + nextHeader.index : file.length;
  const keyMatch = new RegExp(`^[ \\t]*${key}[ \\t]*=[ \\t]*\\[`, 'm').exec(
    file.substring(tableStart, tableEnd)
  );
  if (!keyMatch) {
    return undefined;
  }
  const open = tableStart + keyMatch.index + keyMatch[0].length - 1;
  const items: IStringItem[] = [];
  let i = open + 1;
  while (i < file.length) {
    const ch = file[i];
    if (ch === ']') {
      return { open, close: i, items };
    } else if (ch === '#') {
      const eol = file.indexOf('\n', i);
      i = eol === -1 ? file.length : eol + 1;
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      let value = '';
      while (j < file.length && file[j] !== ch) {
        if (ch === '"' && file[j] === '\\' && j + 1 < file.length) {
          j++;
        }
        value += file[j];
        j++;
      }
      items.push({ start: i, end: j + 1, value });
      i = j + 1;
    } else {
      i++;
    }
  }
  return undefined;
}

export function findRequiresArray(file: string): IStringArray | undefined {
  return findStringArray(file, 'requires');
}

function removeArrayItem(file: string, arr: IStringArray, index: number): string {
  const item = arr.items[index];
  let start = item.start;
  let end = item.end;
  const after = /^\s*,/.exec(file.substring(end, arr.close));
  if (after) {
    end += after[0].length;
  } else {
    const before = /,\s*$/.exec(file.substring(arr.open + 1, start));
    if (before) {
      start = arr.open + 1 + before.index;
    }
  }
  const lineStart = file.lastIndexOf('\n', start - 1) + 1;
  const lineEndIdx = file.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? file.length : lineEndIdx;
  if (
    lineStart > arr.open &&
    lineEnd < arr.close &&
    file.substring(lineStart, start).trim() === '' &&
    file.substring(end, lineEnd).trim() === ''
  ) {
    start = lineStart;
    end = lineEnd + 1;
  }
  return file.substring(0, start) + file.substring(end);
}


function writeComponents(file: string, enabled: Set<string>): string {
  let block = 'components = [';
  for (const component of allComponents) {
    block += enabled.has(component) ? `\n    "${component}",` : `\n    # "${component}",`;
  }
  for (const component of enabled) {
    if (!allComponents.includes(component)) {
      block += `\n    "${component}",`;
    }
  }
  return file.replace(/components = \[[\s\S]*?\]/, block + '\n]');
}

function readEnabledComponents(file: string): Set<string> {
  const enabled = new Set<string>();
  const arr = findStringArray(file, 'components');
  if (arr) {
    for (const item of arr.items) {
      enabled.add(item.value);
    }
  }
  return enabled;
}

export async function enableComponents(workspace: string, components: string[]): Promise<boolean> {
  try {
    const file = await readFile(getPyProjectPath(workspace), 'utf8');
    const enabled = readEnabledComponents(file);
    for (const component of components) {
      enabled.add(component);
    }
    await writeFile(getPyProjectPath(workspace), writeComponents(file, enabled), 'utf8');
    return true;
  } catch (err) {
    logger.log('Error enabling python components, add them manually', err);
    return false;
  }
}

export async function disableComponents(workspace: string, components: string[]): Promise<boolean> {
  try {
    const file = await readFile(getPyProjectPath(workspace), 'utf8');
    const enabled = readEnabledComponents(file);
    for (const component of components) {
      enabled.delete(component);
    }
    await writeFile(getPyProjectPath(workspace), writeComponents(file, enabled), 'utf8');
    return true;
  } catch (err) {
    logger.log('Error disabling python components, remove them manually', err);
    return false;
  }
}

export async function addRequirements(workspace: string, requires: IRequires[]): Promise<boolean> {
  try {
    const file = await readFile(getPyProjectPath(workspace), 'utf8');
    const arr = findRequiresArray(file);
    if (!arr) {
      logger.log('No [tool.robotpy] requires array found in pyproject.toml');
      return false;
    }
    const declared = new Set(arr.items.map((it) => parseRequirement(it.value).name));
    let toAdd = '';
    for (const req of requires) {
      if (!declared.has(req.name)) {
        toAdd += formatRequirement({ ...req, specifier: req.specifier ?? '~=' }) + ', ';
        declared.add(req.name);
      }
    }
    if (!toAdd) {
      return true;
    }
    await writeFile(
      getPyProjectPath(workspace),
      file.substring(0, arr.open + 1) + toAdd + file.substring(arr.open + 1),
      'utf8'
    );
    return true;
  } catch (err) {
    logger.log('Error adding python requirements, add them manually', err);
    return false;
  }
}

export async function removeRequirements(workspace: string, names: string[]): Promise<boolean> {
  try {
    let file = await readFile(getPyProjectPath(workspace), 'utf8');
    for (const name of names) {
      const arr = findRequiresArray(file);
      if (!arr) {
        break;
      }
      const index = arr.items.findIndex((it) => parseRequirement(it.value).name === name);
      if (index !== -1) {
        file = removeArrayItem(file, arr, index);
      }
    }
    await writeFile(getPyProjectPath(workspace), file, 'utf8');
    return true;
  } catch (err) {
    logger.log('Error removing python requirements', err);
    return false;
  }
}

export async function setRequirementVersion(workspace: string, req: IRequires): Promise<boolean> {
  try {
    if (!req.version) {
      return false;
    }
    const file = await readFile(getPyProjectPath(workspace), 'utf8');
    const arr = findRequiresArray(file);
    const item = arr?.items.find((it) => parseRequirement(it.value).name === req.name);
    if (!arr || !item) {
      logger.log(`Requirement ${req.name} not found in pyproject.toml`);
      return false;
    }
    const specifier = req.specifier ?? parseRequirement(item.value).specifier;
    await writeFile(
      getPyProjectPath(workspace),
      file.substring(0, item.start) +
        formatRequirement({ ...req, specifier }) +
        file.substring(item.end),
      'utf8'
    );
    return true;
  } catch (err) {
    logger.log('Error setting python requirement version', err);
    return false;
  }
}

export async function setRobotPyVersion(
  pyprojectPath: string,
  robotpyVersion: string
): Promise<boolean> {
  try {
    const file = await readFile(pyprojectPath, 'utf8');
    await writeFile(
      pyprojectPath,
      file.replace(/^([ \t]*robotpy_version[ \t]*=)[^\r\n#]*/m, `$1 "${robotpyVersion}"`),
      'utf8'
    );
    return true;
  } catch (err) {
    logger.log('Error updating robotpy version', err);
    return false;
  }
}
