'use strict';

import { access, mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import { IUtilitiesAPI } from '../api';
import { logger } from '../logger';

export interface IJsonDependency {
  name: string;
  version: string;
  uuid: string;
  jsonUrl: string;
  fileName: string;
  conflictsWith: IJsonConflicts[] | undefined;
  requires: IJsonRequires[] | undefined;
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

export function isJsonDependency(arg: unknown): arg is IJsonDependency {
  const jsonDep = arg as IJsonDependency;

  return (
    jsonDep.jsonUrl !== undefined &&
    jsonDep.name !== undefined &&
    jsonDep.uuid !== undefined &&
    jsonDep.version !== undefined
  );
}

export class VendorLibrariesBase {
  private utilities: IUtilitiesAPI;

  public constructor(utilities: IUtilitiesAPI) {
    this.utilities = utilities;
  }

  public async findForUUIDs(uuid: string[]): Promise<IJsonDependency[]> {
    const homeDirDeps = await this.getHomeDirDeps();
    const foundDeps = homeDirDeps.filter((value) => {
      return uuid.indexOf(value.uuid) >= 0;
    });
    return foundDeps;
  }

  public async installDependency(
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
        const result = await this.readFile(fullPath);
        if (result !== undefined) {
          if (result.uuid === dep.uuid) {
            if (override) {
              await unlink(fullPath);
              break;
            } else {
              return false;
            }
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

  public getHomeDirDeps(): Promise<IJsonDependency[]> {
    return this.getDependencies(path.join(this.utilities.getWPILibHomeDir(), 'vendordeps'));
  }

  protected async readFile(file: string): Promise<IJsonDependency | undefined> {
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

  protected async getDependencies(dir: string): Promise<IJsonDependency[]> {
    try {
      const files = await readdir(dir);

      const promises: Promise<IJsonDependency | undefined>[] = [];

      for (const file of files) {
        promises.push(this.readFile(path.join(dir, file)));
      }

      const results = await Promise.all(promises);

      return results.filter((x) => x !== undefined) as IJsonDependency[];
    } catch (err) {
      return [];
    }
  }

  protected async loadFileFromUrl(url: string): Promise<IJsonDependency> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (response === undefined) {
        throw new Error('Failed to fetch file');
      }

      if (response.status >= 200 && response.status <= 300) {
        const text = await response.text();
        const json = JSON.parse(text);

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
}
