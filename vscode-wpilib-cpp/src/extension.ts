'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI, getExternalAPIExpectedVersion, getExampleTemplateAPIExpectedVersion, getDeployDebugAPIExpectedVersion, getPreferencesAPIExpectedVersion } from './shared/externalapi';
import { DebugCommands, startDebugging } from './debug';
import { gradleRun, OutputPair } from './gradle';
import * as path from 'path';
import { WpiLibHeaders } from './header_search';
import { CppGradleProperties } from './cpp_gradle_properties';
import { CppVsCodeProperties } from './cpp_vscode_properties';
import { CppPreferences } from './cpp_preferences';

interface DebuggerParse {
    libraryLocations: string[];
    sysroot: string;
    executablePath: string;
    port: string;
    ip: string;
}

function parseGradleOutput(output: OutputPair): DebuggerParse {
    let ret: DebuggerParse = {
        libraryLocations: new Array<string>(),
        sysroot: '',
        executablePath: '',
        port: '',
        ip: ''
    };

    let results = output.stdout.split('\n');
    for (let r of results) {
        if (r.indexOf('WPILIBRARY: ') >= 0) {
            ret.libraryLocations.push(r.substring(12).trim());
        }
        if (r.indexOf('WPICOMPILER: ') >= 0) {
            ret.sysroot = r.substring(12).trim();
        }
        if (r.indexOf('WPIEXECUTABLE: ') >= 0) {
            ret.executablePath = r.substring(15).trim();
        }
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
    console.log('Congratulations, your extension "vscode-wpilib-cpp" is now active!');

    let coreExtension = vscode.extensions.getExtension<IExternalAPI>('wpifirst.vscode-wpilib-core');
    if (coreExtension === undefined) {
        vscode.window.showErrorMessage('Could not find core library');
        return;
    }

    let allowDebug = true;

    let promises = new Array<Thenable<any>>();

    let cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
    if (cppExtension === undefined) {
        vscode.window.showInformationMessage('Could not find cpptools C++ extension. Debugging is disabled.');
        allowDebug = false;
    } else if (!cppExtension.isActive) {
        promises.push(cppExtension.activate());
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
        let workspaces = vscode.workspace.workspaceFolders;

        let gradleProps: CppGradleProperties[] = [];
        let headerFinders: WpiLibHeaders[] = [];
        let cppProps: CppVsCodeProperties[] = [];
        let cppPrefs: CppPreferences[] = [];

        let gradleChannel = vscode.window.createOutputChannel('gradleCpp');

        if (workspaces !== undefined) {
            // Create new header finders for every workspace
            for (let w of workspaces) {
                let p = preferences!.getPreferences(w);
                if (p === undefined) {
                    console.log('Preferences without workspace?');
                    continue;
                }
                let cpr = new CppPreferences(w);
                let gp = new CppGradleProperties(w, gradleChannel, cpr);
                let wh = new WpiLibHeaders(gp);
                let cp = new CppVsCodeProperties(w, gp, cpr);
                cppPrefs.push(cpr);
                gradleProps.push(gp);
                headerFinders.push(wh);
                cppProps.push(cp);
            }
        }

        // On a change in workspace folders, redo all header finders
        preferences!.onDidPreferencesFolderChanged((changed) => {
            // Nuke and reset
            // TODO: Remove existing header finders from the extension context
            for (let p of headerFinders) {
                p.dispose();
            }
            for (let p of gradleProps) {
                p.dispose();
            }
            for (let p of cppPrefs) {
                p.dispose();
            }
            for (let p of cppProps) {
                p.dispose();
            }

            for (let c of changed) {
                let cpr = new CppPreferences(c.workspace);
                let gp = new CppGradleProperties(c.workspace, gradleChannel, cpr);
                let wh = new WpiLibHeaders(gp);
                let cp = new CppVsCodeProperties(c.workspace, gp, cpr);
                cppPrefs.push(cpr);
                gradleProps.push(gp);
                headerFinders.push(wh);
                cppProps.push(cp);
            }

            context.subscriptions.push(...headerFinders);
            context.subscriptions.push(...gradleProps);
            context.subscriptions.push(...cppProps);
            context.subscriptions.push(...cppPrefs);
        });

        context.subscriptions.push(...headerFinders);
        context.subscriptions.push(...gradleProps);
        context.subscriptions.push(...cppProps);
        context.subscriptions.push(...cppPrefs);

        debugDeploy!.addLanguageChoice('cpp');

        debugDeploy!.registerCodeDeploy({
            async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
                let prefs = await preferences!.getPreferences(workspace);
                if (prefs === undefined) {
                    console.log('Preferences without workspace?');
                    return false;
                }
                let currentLanguage = prefs.getCurrentLanguage();
                return currentLanguage === 'none' || currentLanguage === 'cpp';
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
                return 'cpp';
            },
            getDescription(): string {
                return 'C++ Deployment';
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
                    return currentLanguage === 'none' || currentLanguage === 'cpp';
                },
                async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
                    let command = 'deploy getLibraries getCompiler getExecutable --offline -PdebugMode -PteamNumber=' + teamNumber;
                    gradleChannel.clear();
                    gradleChannel.show();
                    if (workspace === undefined) {
                        vscode.window.showInformationMessage('No workspace selected');
                        return false;
                    }
                    let result = await gradleRun(command, workspace.uri.fsPath, gradleChannel);

                    let parsed = parseGradleOutput(result);

                    let soPath = '';

                    for (let p of parsed.libraryLocations) {
                        soPath += path.dirname(p) + ';';
                    }

                    soPath = soPath.substring(0, soPath.length - 1);

                    let config: DebugCommands = {
                        serverAddress: parsed.ip,
                        serverPort: parsed.port,
                        sysroot: parsed.sysroot,
                        executablePath: parsed.executablePath,
                        workspace: workspace,
                        soLibPath: soPath,
                        additionalCommands: []
                    };

                    let cppPref: CppPreferences | undefined = undefined;

                    for (let c of cppPrefs) {
                        if (c.workspace.uri === workspace.uri) {
                            cppPref = c;
                        }
                    }

                    if (cppPref !== undefined) {
                        config.additionalCommands = cppPref.getAdditionalDebugCommands();
                    }

                    await startDebugging(config);

                    console.log(result);
                    return true;
                },
                getDisplayName(): string {
                    return 'cpp';
                },
                getDescription(): string {
                    return 'C++ Debugging';
                }
            });
        }

        context.subscriptions.push(vscode.commands.registerCommand('wpilibcpp.refreshProperties', () => {
            for (let c of gradleProps) {
                c.runGradleRefresh();
            }
        }));
    } else {
        vscode.window.showInformationMessage('Cpp does not match Core. Update');
        console.log('Cpp debug/deploy extension out of date');
        context.subscriptions.push(vscode.commands.registerCommand('wpilibcpp.refreshProperties', () => {
            vscode.window.showInformationMessage('Refresh not currently valid');
        }));
    }

    if (exampleTemplateValid) {
        // Setup examples and template
    } else {
        vscode.window.showInformationMessage('Cpp examples and templates do not match Core. Update');
        console.log('Cpp examples and templates extension out of date');
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
