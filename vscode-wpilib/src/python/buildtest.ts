'use strict';

import * as vscode from 'vscode';
import { ICodeBuilder, IExecuteAPI, IExternalAPI, IPreferencesAPI } from '../api';
import { logger } from '../logger';
import { robotpyRun } from '../utilities';

class CodeBuilder implements ICodeBuilder {
    private preferences: IPreferencesAPI;
    private executeApi: IExecuteAPI;

    constructor(externalApi: IExternalAPI) {
        this.preferences = externalApi.getPreferencesAPI();
        this.executeApi = externalApi.getExecuteAPI();
    }

    public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = this.preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'python';
    }

    public async runBuilder(
        workspace: vscode.WorkspaceFolder,
        _: vscode.Uri | undefined,
        ...args: string[]
    ): Promise<boolean> {
        const command = 'sync ' + args.join(' ');
        const prefs = this.preferences.getPreferences(workspace);
        const result = await robotpyRun(
            command,
            workspace.uri.fsPath,
            workspace,
            'Python Sync',
            this.executeApi,
            prefs
        );
        logger.log(result.toString());
        return true;
    }

    public getDisplayName(): string {
        return 'python';
    }

    public getDescription(): string {
        return 'Python Sync';
    }
}

class CodeTester implements ICodeBuilder {
    private preferences: IPreferencesAPI;
    private executeApi: IExecuteAPI;

    constructor(externalApi: IExternalAPI) {
        this.preferences = externalApi.getPreferencesAPI();
        this.executeApi = externalApi.getExecuteAPI();
    }

    public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = this.preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'python';
    }

    public async runBuilder(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
        const command = 'test ' + args.join(' ');
        const prefs = this.preferences.getPreferences(workspace);
        const result = await robotpyRun(
            command,
            workspace.uri.fsPath,
            workspace,
            'Python Test',
            this.executeApi,
            prefs
        );
        logger.log(result.toString());
        return true;
    }

    public getDisplayName(): string {
        return 'python';
    }

    public getDescription(): string {
        return 'Python Test';
    }
}

export function registerCodeBuilderAndTester(externalApi: IExternalAPI) {
    const buildTestApi = externalApi.getBuildTestAPI();

    buildTestApi.addLanguageChoice('python');

    buildTestApi.registerCodeBuild(new CodeBuilder(externalApi));
    buildTestApi.registerCodeTest(new CodeTester(externalApi));
}
