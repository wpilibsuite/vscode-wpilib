'use strict';

import * as cp from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { IExternalAPI, IToolRunner } from 'vscode-wpilibapi';
import { getIsWindows, promisifyExists, promisifyReadFile } from './utilities';

interface ITool {
  name: string;
  version: string;
}

interface IEnumerateResult {
  tools: ITool[];
  dir: string;
}

class VbsToolRunner implements IToolRunner {
  private toolScript: string;
  private name: string;

  public constructor(toolScript: string, name: string) {
    this.toolScript = toolScript;
    this.name = name;
  }

  public runTool(): Promise<boolean> {
    return new Promise<boolean>((resolve, _reject) => {
      if (getIsWindows()) {
        // If windows, run the vbs script
        cp.exec(`wscript.exe ${this.toolScript} silent`, (err) => {
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } else {
        // Unix, run as javaw
        cp.exec(`javaw -jar ${this.toolScript}`, (err) => {
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      }
    });
  }
  public getDisplayName(): string {
    return this.name;
  }
  public getDescription(): string {
    return '';
  }
}

export class BuiltinTools {
  public static async Create(year: string, api: IExternalAPI): Promise<BuiltinTools> {
    const bt = new BuiltinTools(year);
    const toolApi = api.getToolAPI();
    const homeTools = await bt.enumerateHomeTools();
    const isWindows = getIsWindows();
    for (const ht of homeTools.tools) {
      if (isWindows) {
        const toolPath = path.join(homeTools.dir, ht.name + '.vbs');
        if (await promisifyExists(toolPath)) {
          // Tool exists, add it
          toolApi.addTool(new VbsToolRunner(toolPath, ht.name));
        }
      } else {
        const toolPath = path.join(homeTools.dir, ht.name + '.jar');
        if (await promisifyExists(toolPath)) {
          // Tool exists, add it
          toolApi.addTool(new VbsToolRunner(toolPath, ht.name));
        }
      }
    }
    return bt;
  }

  private readonly year: string;

  private constructor(year: string) {
    this.year = year;
  }

  private getHomeDir(): string {
    const frcHome = process.env[`FRC_${this.year}_HOME`];
    if (frcHome) {
      return frcHome;
    } else {
      if (getIsWindows()) {
        // Windows, search public home
        return '';
      } else {
        // Unix, search user home
        const dir = os.homedir();
        const wpilibhome = path.join(dir, `wpilib${this.year}`);
        return wpilibhome;
      }
    }
  }

  private async enumerateHomeTools(): Promise<IEnumerateResult> {
    const homeDir = this.getHomeDir();
    const toolsDir = path.join(homeDir, 'tools');

    const toolsJson = path.join(toolsDir, 'tools.json');

    try {
      const jsonFileContents = await promisifyReadFile(toolsJson);
      const jsonResult = JSON.parse(jsonFileContents) as ITool[];
      return {
        dir: toolsDir,
        tools: jsonResult,
      };
    } catch (err) {
      return {
        dir: toolsDir,
        tools: [],
      };
    }
  }
}
