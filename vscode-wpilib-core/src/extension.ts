'use strict';

import * as vscode from 'vscode';
import { IExternalAPI, } from './shared/externalapi';
import { requestTeamNumber } from './preferences';
import * as path from 'path';
import { ToolAPI } from './toolapi';
import { DeployDebugAPI } from './deploydebugapi';
import { PreferencesAPI } from './preferencesapi';
import { ExampleTemplateAPI } from './exampletemplateapi';
import { RioConsole } from './riolog/rioconsole';

class ExternalAPI extends IExternalAPI {
    private toolApi: ToolAPI;
    private debugDeployApi: DeployDebugAPI;
    private preferencesApi: PreferencesAPI;
    private exampleTemplateApi: ExampleTemplateAPI;
    constructor(resourcesLocation: string) {
        super();
        this.toolApi = new ToolAPI();
        this.preferencesApi = new PreferencesAPI();
        this.debugDeployApi = new DeployDebugAPI(resourcesLocation, this.preferencesApi);
        this.exampleTemplateApi = new ExampleTemplateAPI();
    }

    getToolAPI(): ToolAPI {
        return this.toolApi;
    }
    getExampleTemplateAPI(): ExampleTemplateAPI {
        return this.exampleTemplateApi;
    }
    getDeployDebugAPI(): DeployDebugAPI {
        return this.debugDeployApi;
    }
    getPreferencesAPI(): PreferencesAPI {
        return this.preferencesApi;
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Resources folder will be used for RioLog
    let extensionResourceLocation = path.join(context.extensionPath, 'resources');

    let externalApi = new ExternalAPI(extensionResourceLocation);

    let rioCon = new RioConsole();
    context.subscriptions.push(rioCon);
    rioCon.startListening(9999);

    rioCon.addListener((m) => {
        console.log('got message');
    });

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-wpilib-core" is now active!');

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startRioLog', async () => {
        let preferencesApi = externalApi.getPreferencesAPI();
        let workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        let preferences = preferencesApi.getPreferences(workspace);
        if (preferences === undefined) {
            vscode.window.showInformationMessage('Could not find a workspace');
            return;
        }
        await externalApi.getDeployDebugAPI().startRioLog(await preferences.getTeamNumber(), true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () => {
        let preferencesApi = externalApi.getPreferencesAPI();
        let workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        let preferences = preferencesApi.getPreferences(workspace);
        if (preferences === undefined) {
            vscode.window.showInformationMessage('Could not find a workspace');
            return;
        }
        let request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
        if (request === undefined) {
            return;
        }
        await preferences.setTeamNumber(await requestTeamNumber(), request === 'Globally');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startTool', async () => {
        await externalApi.getToolAPI().startTool();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.deployCode', async () => {
        let preferencesApi = externalApi.getPreferencesAPI();
        let workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        await externalApi.getDeployDebugAPI().deployCode(workspace);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.debugCode', async () => {
        let preferencesApi = externalApi.getPreferencesAPI();
        let workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        await externalApi.getDeployDebugAPI().debugCode(workspace);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setLanguage', async () => {
        let preferencesApi = externalApi.getPreferencesAPI();
        let workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }

        let debugDeployApi = externalApi.getDeployDebugAPI();

        if (debugDeployApi.languageChoices.length <= 0) {
            await vscode.window.showInformationMessage('No languages available to add');
        }
        let result = await vscode.window.showQuickPick(debugDeployApi.languageChoices, { placeHolder: 'Pick a language' });
        if (result === undefined) {
            return;
        }

        let preferences = preferencesApi.getPreferences(workspace);
        if (preferences === undefined) {
            vscode.window.showInformationMessage('Could not find a workspace');
            return;
        }
        preferences.setCurrentLanguage(result);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setAutoSave', async () => {
        let preferencesApi = externalApi.getPreferencesAPI();
        let workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }

        let result = await vscode.window.showInformationMessage('Automatically save on deploy?', 'Yes', 'No');
        if (result === undefined) {
            return;
        }
        let preferences = preferencesApi.getPreferences(workspace);
        if (preferences === undefined) {
            vscode.window.showInformationMessage('Could not find a workspace');
            return;
        }
        let request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
        if (request === undefined) {
            return;
        }
        preferences.setAutoSaveOnDeploy(result === 'Yes', request === 'Globally');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStartRioLog', async () => {
        let preferencesApi = externalApi.getPreferencesAPI();
        let workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }

        let result = await vscode.window.showInformationMessage('Automatically start RioLog on deploy?', 'Yes', 'No');
        if (result === undefined) {
            return;
        }
        let preferences = preferencesApi.getPreferences(workspace);
        if (preferences === undefined) {
            vscode.window.showInformationMessage('Could not find a workspace');
            return;
        }
        let request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
        if (request === undefined) {
            return;
        }
        preferences.setAutoStartRioLog(result === 'Yes', request === 'Globally');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createExample', async () => {
        await externalApi.getExampleTemplateAPI().createExample();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createTemplate', async () => {
        await externalApi.getExampleTemplateAPI().createTemplate();
    }));

    return externalApi;
}

// this method is called when your extension is deactivated
export function deactivate() {
}
