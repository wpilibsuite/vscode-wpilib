'use strict';

import * as path from 'path';
import { logger } from '../logger';
import { promisifyMkdirp, promisifyReadDir } from '../shared/generator';
import { promisifyDeleteFile, promisifyExists, promisifyReadFile, promisifyWriteFile } from '../utilities';
import { IUtilitiesAPI } from '../wpilibapishim';

export interface IJsonDependency {
  name: string;
  version: string;
  uuid: string;
  jsonUrl: string;
  fileName: string;
}

// tslint:disable-next-line:no-any
export function isJsonDependency(arg: any): arg is IJsonDependency {
  const jsonDep = arg as IJsonDependency;

  return jsonDep.jsonUrl !== undefined && jsonDep.name !== undefined
         && jsonDep.uuid !== undefined && jsonDep.version !== undefined;
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

  public getVendorFolder(root: string): string {
    return path.join(root, 'vendordeps');
  }

  public async installDependency(dep: IJsonDependency, url: string, override: boolean): Promise<boolean> {
    const dirExists = await promisifyExists(url);

    if (!dirExists) {
      await promisifyMkdirp(url);
      // Directly write file
      await promisifyWriteFile(path.join(url, dep.fileName), JSON.stringify(dep, null, 4));
      return true;
    }

    const files = await promisifyReadDir(url);

    for (const file of files) {
      const fullPath = path.join(url, file);
      const result = await this.readFile(fullPath);
      if (result !== undefined) {
        if (result.uuid === dep.uuid) {
          if (override) {
            await promisifyDeleteFile(fullPath);
            break;
          } else {
            return false;
          }
        }
      }
    }

    await promisifyWriteFile(path.join(url, dep.fileName), JSON.stringify(dep, null, 4));
    return true;
  }

  protected getHomeDirDeps(): Promise<IJsonDependency[]> {
    return this.getDependencies(path.join(this.utilities.getWPILibHomeDir(), 'vendordeps'));
  }

  protected async readFile(file: string): Promise<IJsonDependency | undefined> {
    try {
      const jsonContents = await promisifyReadFile(file);
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
      const files = await promisifyReadDir(dir);

      const promises: Array<Promise<IJsonDependency | undefined>> = [];

      for (const file of files) {
        promises.push(this.readFile(path.join(dir, file)));
      }

      const results = await Promise.all(promises);

      return results.filter((x) => x !== undefined) as IJsonDependency[];
    } catch (err) {
      return [];
    }
  }

}
