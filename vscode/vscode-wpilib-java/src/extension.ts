'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI, getPreferencesAPIExpectedVersion, getDeployDebugAPIExpectedVersion, getExampleTemplateAPIExpectedVersion, getExternalAPIExpectedVersion } from './shared/externalapi';
import { DebugCommands, startDebugging } from './debug';
import { gradleRun, OutputPair } from './shared/gradle';
import * as path from 'path';
import { Examples } from './shared/examples';
import { Templates } from './shared/templates';

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
export async function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-wpilib-java" is now active!');

    const extensionResourceLocation = path.join(context.extensionPath, 'resources');

    const coreExtension = vscode.extensions.getExtension<IExternalAPI>('wpifirst.vscode-wpilib-core');
    if (coreExtension === undefined) {
        vscode.window.showErrorMessage('Could not find core library');
        return;
    }

    let allowDebug = true;

    const javaExtension = vscode.extensions.getExtension('vscjava.vscode-java-debug');
    if (javaExtension === undefined) {
        vscode.window.showInformationMessage('Could not find java extension. Debugging is disabled.');
        allowDebug = false;
    }

    if (!coreExtension.isActive) {
        await coreExtension.activate();
    }

    const coreExports: IExternalAPI = coreExtension.exports;

    const baseValid = coreExports.getVersion() === getExternalAPIExpectedVersion();

    if (!baseValid) {
        vscode.window.showErrorMessage('Extension out of date with core extension. Please update');
        return;
    }

    const preferences = coreExports.getPreferencesAPI();
    const debugDeploy = coreExports.getDeployDebugAPI();
    const exampleTemplate = coreExports.getExampleTemplateAPI();

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

    if (debugDeployValid === true && preferencesValid === true && debugDeploy !== undefined && preferences !== undefined) {
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

    if (exampleTemplateValid === true && exampleTemplate !== undefined) {
        // Setup examples and template
        const examples: Examples = new Examples(extensionResourceLocation, 'java', exampleTemplate);
        context.subscriptions.push(examples);
        const templates: Templates = new Templates(extensionResourceLocation, 'java', exampleTemplate);
        context.subscriptions.push(templates);
    } else {
        vscode.window.showInformationMessage('Java examples and templates do not match Core. Update');
        console.log('Java examples and templates extension out of date');
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
