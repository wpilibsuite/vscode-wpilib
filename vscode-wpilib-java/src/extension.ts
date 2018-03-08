'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI, getPreferencesAPIExpectedVersion, getDeployDebugAPIExpectedVersion, getExampleTemplateAPIExpectedVersion, getExternalAPIExpectedVersion } from './shared/externalapi';
import { DebugCommands, startDebugging } from './debug';
import { gradleRun, OutputPair } from './gradle';
import * as path from 'path';
import { Examples } from './examples';
import { Templates } from './templates';

interface DebuggerParse {
    port: string;
    ip: string;
}

function parseGradleOutput(output: OutputPair): DebuggerParse {
    let ret: DebuggerParse = {
        port: '',
        ip: ''
    };

    let results = output.stdout.split('\n');
    for (let r of results) {
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
export async function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-wpilib-java" is now active!');

    let extensionResourceLocation = path.join(context.extensionPath, 'resources');

    let coreExtension = vscode.extensions.getExtension<IExternalAPI>('wpifirst.vscode-wpilib-core');
    if (coreExtension === undefined) {
        vscode.window.showErrorMessage('Could not find core library');
        return;
    }

    let allowDebug = true;

    let promises = new Array<Thenable<any>>();

    let javaExtension = vscode.extensions.getExtension('vscjava.vscode-java-debug');
    if (javaExtension === undefined) {
        vscode.window.showInformationMessage('Could not find java extension. Debugging is disabled.');
        allowDebug = false;
    } else if (!javaExtension.isActive) {
        promises.push(javaExtension.activate());
    }

    if (!coreExtension.isActive) {
        promises.push(coreExtension.activate());
    }

    if (promises.length > 0) {
        await Promise.all(promises);
    }

    let coreExports: IExternalAPI = coreExtension.exports;

    let baseValid = coreExports.getVersion() === getExternalAPIExpectedVersion();

    if (!baseValid) {
        vscode.window.showErrorMessage('Extension out of date with core extension. Please update');
        return;
    }

    let preferences = coreExports.getPreferencesAPI();
    let debugDeploy = coreExports.getDeployDebugAPI();
    let exampleTemplate = coreExports.getExampleTemplateAPI();

    let exampleTemplateValid = false;
    let debugDeployValid = false;
    let preferencesValid = false;

    if (exampleTemplate !== undefined) {
        exampleTemplateValid = exampleTemplate.getVersion() === getExampleTemplateAPIExpectedVersion();
    }

    if (debugDeploy !== undefined) {
        debugDeployValid = debugDeploy.getVersion() === getDeployDebugAPIExpectedVersion();
    }

    if (preferences !== undefined) {
        preferencesValid = preferences.getVersion() === getPreferencesAPIExpectedVersion();
    }

    if (debugDeployValid && preferencesValid) {
        // Setup debug and deploy

        let gradleChannel = vscode.window.createOutputChannel('gradleJava');

        debugDeploy!.addLanguageChoice('java');

        debugDeploy!.registerCodeDeploy({
            async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
                let prefs = await preferences!.getPreferences(workspace);
                if (prefs === undefined) {
                    console.log('Preferences without workspace?');
                    return false;
                }
                let currentLanguage = prefs.getCurrentLanguage();
                return currentLanguage === 'none' || currentLanguage === 'java';
            },
            async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
                let command = 'deploy --offline -PteamNumber=' + teamNumber;
                gradleChannel.clear();
                gradleChannel.show();
                if (workspace === undefined) {
                    vscode.window.showInformationMessage('No workspace selected');
                    return false;
                }
                let result = await gradleRun(command, workspace.uri.fsPath, gradleChannel);
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

        if (allowDebug) {
            debugDeploy!.registerCodeDebug({
                async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
                    let prefs = await preferences!.getPreferences(workspace);
                    if (prefs === undefined) {
                        console.log('Preferences without workspace?');
                        return false;
                    }
                    let currentLanguage = prefs.getCurrentLanguage();
                    return currentLanguage === 'none' || currentLanguage === 'java';
                },
                async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
                    let command = 'deploy --offline -PdebugMode -PteamNumber=' + teamNumber;
                    gradleChannel.clear();
                    gradleChannel.show();
                    let result = await gradleRun(command, workspace.uri.fsPath, gradleChannel);

                    let parsed = parseGradleOutput(result);

                    let config: DebugCommands = {
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

    if (exampleTemplateValid) {
        // Setup examples and template
        let examples: Examples = new Examples(extensionResourceLocation, exampleTemplate!);
        context.subscriptions.push(examples);
        let templates: Templates = new Templates(extensionResourceLocation, exampleTemplate!);
        context.subscriptions.push(templates);
    } else {
        vscode.window.showInformationMessage('Java examples and templates do not match Core. Update');
        console.log('Java examples and templates extension out of date');
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
