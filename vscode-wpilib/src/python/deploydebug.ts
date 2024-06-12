'use strict';

import * as vscode from 'vscode';
import { ICodeDeployer, IPreferencesAPI } from 'vscode-wpilibapi';
import { IExternalAPIEx } from '../extension';
import { PyPreferencesAPI } from './pypreferencesapi';
import { IExecuteAPIEx } from '../executor';

function getCurrentFileIfPython(): string | undefined {
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor === undefined) {
        return undefined;
    }
    if (currentEditor.document.fileName.endsWith('.py')) {
        return currentEditor.document.fileName;
    }
    return undefined;
}

class DeployCodeDeployer implements ICodeDeployer {
    private preferences: IPreferencesAPI;
    private pyPreferences : PyPreferencesAPI;
    private executeApi: IExecuteAPIEx;

    constructor(externalApi: IExternalAPIEx, pyPreferences: PyPreferencesAPI) {
        this.preferences = externalApi.getPreferencesAPI();
        this.executeApi = externalApi.getExecuteAPIEx();
        this.pyPreferences = pyPreferences;
    }

    public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = this.preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'python';
    }

    public async runDeployer(_teamNumber: number, workspace: vscode.WorkspaceFolder,
                             source: vscode.Uri | undefined, ..._args: string[]): Promise<boolean> {
        let file: string = '';
        if (source === undefined) {
            const cFile = getCurrentFileIfPython();
            if (cFile !== undefined) {
                file = cFile;
            } else {
                const mFile = await this.pyPreferences.getPreferences(workspace).getMainFile();
                if (mFile === undefined) {
                    return false;
                }
                file = mFile;
            }
        } else {
            file = source.fsPath;
        }

        const prefs = this.preferences.getPreferences(workspace);

        const deploy = [file, 'deploy', `--team=${await prefs.getTeamNumber()}`];

        if (prefs.getSkipTests()) {
            deploy.push('--skip-tests');
        }

        const result = await this.executeApi.executePythonCommand(deploy, workspace.uri.fsPath, workspace, 'Python Deploy');

        return result === 0;
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

    constructor(externalApi: IExternalAPIEx, pyPreferences: PyPreferencesAPI) {
        const deployDebugApi = externalApi.getDeployDebugAPI();
        deployDebugApi.addLanguageChoice('python');

        // this.deployDebuger = new DebugCodeDeployer(externalApi);
        this.deployDeployer = new DeployCodeDeployer(externalApi, pyPreferences);
        // this.simulator = new SimulateCodeDeployer(externalApi);

        deployDebugApi.registerCodeDeploy(this.deployDeployer);

        //   if (allowDebug) {
        //     deployDebugApi.registerCodeDebug(this.deployDebuger);
        //     deployDebugApi.registerCodeSimulate(this.simulator);
        //   }
    }

    // tslint:disable-next-line:no-empty
    public dispose() {
    }
}
