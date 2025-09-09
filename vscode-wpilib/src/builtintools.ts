'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import { IExternalAPI, IPreferencesAPI, IToolRunner, IUtilitiesAPI } from './api';
import { existsAsync, getIsWindows, readFileAsync } from './utilities';

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
  private preferences: IPreferencesAPI;

  public constructor(toolScript: string, name: string, preferences: IPreferencesAPI) {
    this.toolScript = toolScript;
    this.name = name;
    this.preferences = preferences;
  }

  public async runTool(): Promise<boolean> {
    const wp = await this.preferences.getFirstOrSelectedWorkspace();
    return new Promise<boolean>((resolve, _reject) => {
      let cmd = getIsWindows() ? `wscript.exe ${this.toolScript}` : `sh ${this.toolScript}`;

      if (wp !== undefined) {
        const toolStoreFolder = path.join(wp.uri.fsPath, `.${this.name}`);
        cmd += ` "${toolStoreFolder}"`;
      }

      cp.exec(cmd, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
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
        if (await existsAsync(toolPath)) {
          // Tool exists, add it
          toolApi.addTool(new VbsToolRunner(toolPath, ht.name, api.getPreferencesAPI()));
        }
      } else {
        const toolPath = path.join(homeTools.dir, ht.name + '.sh');
        if (await existsAsync(toolPath)) {
          // Tool exists, add it
          toolApi.addTool(new VbsToolRunner(toolPath, ht.name, api.getPreferencesAPI()));
        }
      }
    }
    return bt;
  }

  private utilities: IUtilitiesAPI;

  private constructor(utilities: IUtilitiesAPI) {
    this.utilities = utilities;
  }

  public dispose() {
    //
  }

  private async enumerateHomeTools(): Promise<IEnumerateResult> {
    const homeDir = this.utilities.getWPILibHomeDir();
    const toolsDir = path.join(homeDir, 'tools');

    const toolsJson = path.join(toolsDir, 'tools.json');

    try {
      const jsonFileContents = await readFileAsync(toolsJson, 'utf8');
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
