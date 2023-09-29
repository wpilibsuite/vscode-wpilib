'use strict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICodeDeployer, IExecuteAPI, IExternalAPI, IPreferencesAPI } from 'vscode-wpilibapi';
import { gradleRun, readFileAsync } from '../utilities';

class DeployCodeDeployer implements ICodeDeployer {
    private preferences: IPreferencesAPI;
    private executeApi: IExecuteAPI;

    constructor(externalApi: IExternalAPI) {
        this.preferences = externalApi.getPreferencesAPI();
        this.executeApi = externalApi.getExecuteAPI();
    }

    public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = this.preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'java';
    }

    public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder,
        _: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
            // TODO actaully deploy
        return false;
    }

    public getDisplayName(): string {
        return 'python';
    }

    public getDescription(): string {
        return 'Python Deploy';
    }
}

export class DeployDebug {
    private deployDeployer: DeployCodeDeployer;

    constructor(externalApi: IExternalAPI) {
      const deployDebugApi = externalApi.getDeployDebugAPI();
      deployDebugApi.addLanguageChoice('python');

      //this.deployDebuger = new DebugCodeDeployer(externalApi);
      this.deployDeployer = new DeployCodeDeployer(externalApi);
      //this.simulator = new SimulateCodeDeployer(externalApi);

      deployDebugApi.registerCodeDeploy(this.deployDeployer);

    //   if (allowDebug) {
    //     deployDebugApi.registerCodeDebug(this.deployDebuger);
    //     deployDebugApi.registerCodeSimulate(this.simulator);
    //   }
    }

    public dispose() {
      //
    }
  }
