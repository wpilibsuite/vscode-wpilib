'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import { IExternalAPI, IToolRunner, IUtilitiesAPI } from 'vscode-wpilibapi';
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
        cp.exec(`java -jar ${this.toolScript}`, (err) => {
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
  public static async Create(api: IExternalAPI): Promise<BuiltinTools> {
    const bt = new BuiltinTools(api.getUtilitiesAPI());
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

  private utilities: IUtilitiesAPI;

  private constructor(utilities: IUtilitiesAPI) {
    this.utilities = utilities;
  }

  public dispose()  {
    //
  }

  private async enumerateHomeTools(): Promise<IEnumerateResult> {
    const homeDir = this.utilities.getWPILibHomeDir();
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
