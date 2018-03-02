'use strict';

import * as vscode from 'vscode';
import { IExternalAPI, ICodeDeployer, IToolRunner, IPreferences } from './shared/externalapi';
import { RioLog } from './riolog';
import { Preferences, requestTeamNumber } from './preferences';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let riolog = new RioLog();
    context.subscriptions.push(riolog);

    // Array of preferences are used with Multi Workspace Folders
    let preferences: Preferences[] = [];
    let workspaces = vscode.workspace.workspaceFolders;

    if (workspaces === undefined) {
        vscode.window.showErrorMessage('WPILib does not support single file');
        return;
    }

    // Create new preferences for every workspace
    for (let w of workspaces) {
        preferences.push(new Preferences(w));
    }

    // On a change in workspace folders, redo all preferences
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
        // Nuke and reset
        // TODO: Remove existing preferences from the extension context
        for (let p of preferences) {
            p.dispose();
        }

        let wp = vscode.workspace.workspaceFolders;

        if (wp === undefined) {
            return;
        }

        for (let w of wp) {
            preferences.push(new Preferences(w));
        }

        context.subscriptions.push(...preferences);
    }));

    context.subscriptions.push(...preferences);

    // Resources folder will be used for RioLog
    let extensionResourceLocation = path.join(context.extensionPath, 'resources');

    // Storage for our registered language choices.
    let tools = new Array<IToolRunner>();
    let codeDeployers = new Array<ICodeDeployer>();
    let codeDebuggers = new Array<ICodeDeployer>();
    let languageChoices = new Array<string>();

    let api : IExternalAPI = {
        async startRioLog(teamNumber: number) : Promise<void> {
            riolog.connect(teamNumber, path.join(extensionResourceLocation, 'riolog'));
        },
        async startTool(): Promise<void> {
            if (tools.length <= 0) {
                vscode.window.showErrorMessage('No tools found. Please install some');
                return;
            }

            let toolNames = new Array<string>();
            for (let t of tools) {
                toolNames.push(t.getDisplayName());
            }

            let result = await vscode.window.showQuickPick(toolNames, { placeHolder: 'Pick a tool'});

            if (result === undefined) {
                vscode.window.showInformationMessage('Tool run canceled');
                return;
            }

            for (let t of tools) {
                if (t.getDisplayName() === result) {
                    await t.runTool();
                    return;
                }
            }

            vscode.window.showErrorMessage('Invalid tool entered');
            return;
        },
        addTool(tool: IToolRunner): void {
            tools.push(tool);
        },
        async deployCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
            if (codeDeployers.length <= 0) {
                vscode.window.showErrorMessage('No registered deployers');
                return false;
            }

            let prefs = await this.getPreferences(workspace);

            let availableDeployers = new Array<ICodeDeployer>();
            for (let d of codeDeployers) {
                if (await d.getIsCurrentlyValid(workspace)) {
                    availableDeployers.push(d);
                }
            }

            if (availableDeployers.length <= 0) {
                vscode.window.showErrorMessage('No registered deployers');
                return false;
            } else if (availableDeployers.length === 1) {
                if (prefs.getAutoSaveOnDeploy()) {
                    vscode.workspace.saveAll();
                }
                let teamNumber = await prefs.getTeamNumber();
                let ret = await availableDeployers[0].runDeployer(teamNumber, workspace);
                if (prefs.getAutoStartRioLog() && ret) {
                    await this.startRioLog(teamNumber);
                }
                return ret;
            } else {
                let names = new Array<string>();
                for (let d of availableDeployers) {
                    names.push(d.getDisplayName());
                }
                let result = await vscode.window.showQuickPick(names, {placeHolder: 'Pick a deploy language'});
                if (result === undefined) {
                    await vscode.window.showInformationMessage('Deploy exited');
                    return false;
                }

                for (let d of availableDeployers) {
                    if (d.getDisplayName() === result) {
                        if (prefs.getAutoSaveOnDeploy()) {
                            vscode.workspace.saveAll();
                        }
                        let teamNumber = await prefs.getTeamNumber();
                        let ret = await d.runDeployer(teamNumber, workspace);
                        if (prefs.getAutoStartRioLog() && ret) {
                            await this.startRioLog(teamNumber);
                        }
                        return ret;
                    }
                }

                await vscode.window.showInformationMessage('Deploy exited');
                return false;
            }
        },
        registerCodeDeploy(deployer: ICodeDeployer): void {
            codeDeployers.push(deployer);
        },
        async debugCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
            if (codeDebuggers.length <= 0) {
                vscode.window.showErrorMessage('No registered debuggers');
                return false;
            }

            let availableDebuggers = new Array<ICodeDeployer>();
            for (let d of codeDebuggers) {
                if (await d.getIsCurrentlyValid(workspace)) {
                    availableDebuggers.push(d);
                }
            }

            if (availableDebuggers.length <= 0) {
                vscode.window.showErrorMessage('No registered debuggers');
                return false;
            } else if (availableDebuggers.length === 1) {
                let prefs = this.getPreferences(workspace);
                if (prefs.getAutoSaveOnDeploy()) {
                    vscode.workspace.saveAll();
                }
                await availableDebuggers[0].runDeployer(await prefs.getTeamNumber(), workspace);
            } else {
                let names = new Array<string>();
                for (let d of availableDebuggers) {
                    names.push(d.getDisplayName());
                }
                let result = await vscode.window.showQuickPick(names, { placeHolder: 'Pick a debug language'});
                if (result === undefined) {
                    await vscode.window.showInformationMessage('Debug exited');
                    return false;
                }

                for (let d of availableDebuggers) {
                    if (d.getDisplayName() === result) {
                        let prefs = this.getPreferences(workspace);
                        if (prefs.getAutoSaveOnDeploy()) {
                            vscode.workspace.saveAll();
                        }
                        return await d.runDeployer(await prefs.getTeamNumber(), workspace);
                    }
                }

                await vscode.window.showInformationMessage('Debug exited');
                return false;
            }
            return false;
        },
        registerCodeDebug(deployer: ICodeDeployer): void {
            codeDebuggers.push(deployer);
        },
        getApiVersion(): number {
            return 1;
        },
        getPreferences(workspace: vscode.WorkspaceFolder): IPreferences {
            for (let p of preferences) {
                if (p.workspace.uri === workspace.uri) {
                    return p;
                }
            }
            return preferences[0];
        },
        addLanguageChoice(language: string): void {
            languageChoices.push(language);
        },
        async getFirstOrSelectedWorkspace(): Promise<vscode.WorkspaceFolder | undefined> {
            let wp = vscode.workspace.workspaceFolders;
            if (wp === undefined) {
                return undefined;
            }

            if (wp.length > 1) {
                let res = await vscode.window.showWorkspaceFolderPick();
                if (res !== undefined) {
                    return res;
                }
                return undefined;
            } else if (wp.length === 1) {
                return wp[0];
            } else {
                return undefined;
            }
        }
    };

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-wpilib-core" is now active!');

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startRioLog', async () =>{
        let workspace = await api.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        await api.startRioLog(await api.getPreferences(workspace).getTeamNumber());
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () =>{
        let workspace = await api.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        await api.getPreferences(workspace).setTeamNumber(await requestTeamNumber());
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startTool', async () =>{
        await api.startTool();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.deployCode', async () =>{
        let workspace = await api.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        await api.deployCode(workspace);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.debugCode', async () =>{
        let workspace = await api.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        await api.debugCode(workspace);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setLanguage', async () =>{
        let workspace = await api.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }

        if (languageChoices.length <= 0) {
            await vscode.window.showInformationMessage('No languages available to add');
        }
        let result = await vscode.window.showQuickPick(languageChoices, { placeHolder: 'Pick a language' } );
        if (result === undefined) {
            return;
        }

        let preferences = api.getPreferences(workspace);
        preferences.setCurrentLanguage(result);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setAutoSave', async () =>{
        let workspace = await api.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        let result = await vscode.window.showInformationMessage('Automatically save on deploy?', 'Yes', 'No');
        if (result === undefined) {
            return;
        }
        let preferences = api.getPreferences(workspace);
        preferences.setAutoSaveOnDeploy(result === 'Yes');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStartRioLog', async () =>{
        let workspace = await api.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
            return;
        }
        let result = await vscode.window.showInformationMessage('Automatically start RioLog on deploy?', 'Yes', 'No');
        if (result === undefined) {
            return;
        }
        let preferences = api.getPreferences(workspace);
        preferences.setAutoStartRioLog(result === 'Yes');
    }));

    return api;
}

// this method is called when your extension is deactivated
export function deactivate() {
}
