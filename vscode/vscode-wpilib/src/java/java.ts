'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DebugCommands, startDebugging } from './debug';
import { gradleRun, OutputPair } from '../shared/gradle';
import * as path from 'path';
import { Examples } from '../shared/examples';
import { Templates } from '../shared/templates';
import { Commands } from './commands';
import { IExternalAPI } from '../shared/externalapi';

interface DebuggerParse {
    port: string;
    ip: string;
}

function parseGradleOutput(output: OutputPair): DebuggerParse {
    const ret: DebuggerParse = {
        port: '',
        ip: ''
    };

    const results = output.stdout.split('\n');
    for (const r of results) {
        if (r.indexOf('DEBUGGING ACTIVE ON PORT ') >= 0) {
            ret.port = r.substring(27, r.indexOf('!')).trim();
        }
        if (r.indexOf('Using address ') >= 0) {
            ret.ip = r.substring(14, r.indexOf(' for')).trim();
        }
    }

    return ret;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateJava(context: vscode.ExtensionContext, coreExports: IExternalAPI) {

    const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'java');

    let allowDebug = true;

    const javaExtension = vscode.extensions.getExtension('vscjava.vscode-java-debug');
    if (javaExtension === undefined) {
        //TODO: Make this a visible warning message when project detected is java
        console.log('Could not find java extension. Debugging is disabled.');
        allowDebug = false;
    }

    const preferences = coreExports.getPreferencesAPI();
    const debugDeploy = coreExports.getDeployDebugAPI();
    const exampleTemplate = coreExports.getExampleTemplateAPI();
    const commandApi = coreExports.getCommandAPI();

    if (debugDeploy !== undefined && preferences !== undefined) {
        // Setup debug and deploy

        const gradleChannel = vscode.window.createOutputChannel('gradleJava');

        debugDeploy.addLanguageChoice('java');

        debugDeploy.registerCodeDeploy({
            async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
                const prefs = await preferences.getPreferences(workspace);
                if (prefs === undefined) {
                    console.log('Preferences without workspace?');
                    return false;
                }
                const currentLanguage = prefs.getCurrentLanguage();
                return currentLanguage === 'none' || currentLanguage === 'java';
            },
            async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
                const command = 'deploy --offline -PteamNumber=' + teamNumber;
                gradleChannel.clear();
                gradleChannel.show();
                if (workspace === undefined) {
                    vscode.window.showInformationMessage('No workspace selected');
                    return false;
                }
                const result = await gradleRun(command, workspace.uri.fsPath, gradleChannel);
                console.log(result);
                return true;
            },
            getDisplayName(): string {
                return 'java';
            },
            getDescription(): string {
                return 'Java Deploy';
            }
        });

        if (allowDebug === true) {
            debugDeploy.registerCodeDebug({
                async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
                    const prefs = await preferences.getPreferences(workspace);
                    if (prefs === undefined) {
                        console.log('Preferences without workspace?');
                        return false;
                    }
                    const currentLanguage = prefs.getCurrentLanguage();
                    return currentLanguage === 'none' || currentLanguage === 'java';
                },
                async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
                    const command = 'deploy --offline -PdebugMode -PteamNumber=' + teamNumber;
                    gradleChannel.clear();
                    gradleChannel.show();
                    const result = await gradleRun(command, workspace.uri.fsPath, gradleChannel);

                    const parsed = parseGradleOutput(result);

                    const config: DebugCommands = {
                        serverAddress: parsed.ip,
                        serverPort: parsed.port,
                        workspace: workspace
                    };

                    await startDebugging(config);

                    console.log(result);
                    return true;
                },
                getDisplayName(): string {
                    return 'java';
                },
                getDescription(): string {
                    return 'Java Debugging';
                }
            });
        }
    } else {
        vscode.window.showInformationMessage('Java does not match Core. Update');
        console.log('Java debug/deploy extension out of date');
    }

    if (commandApi !== undefined && preferences !== undefined) {
        // Setup commands
        const commands: Commands = new Commands(extensionResourceLocation, commandApi, preferences);
        context.subscriptions.push(commands);
    }

    if (exampleTemplate !== undefined) {
        // Setup examples and template
        const examples: Examples = new Examples(extensionResourceLocation, true, exampleTemplate);
        context.subscriptions.push(examples);
        const templates: Templates = new Templates(extensionResourceLocation, true, exampleTemplate);
        context.subscriptions.push(templates);
    } else {
        vscode.window.showInformationMessage('Java examples and templates do not match Core. Update');
        console.log('Java examples and templates extension out of date');
    }
}
