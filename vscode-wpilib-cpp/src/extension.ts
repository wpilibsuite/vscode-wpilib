'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI } from './shared/externalapi';
import { DebugCommands, startDebugging } from './debug';
import { gradleRun, OutputPair } from './gradle';
import * as path from 'path';
import { WpiLibHeaders } from './header_search';
import { CppGradleProperties } from './cpp_gradle_properties';
import { CppVsCodeProperties } from './cpp_vscode_properties';

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
    for(let r of results) {
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
        allowDebug =  false;
    } else if (!cppExtension.isActive) {
        promises.push(cppExtension.activate());
    }

    if (!coreExtension.isActive) {
        promises.push(coreExtension.activate());
    }

    if (promises.length > 0) {
        await Promise.all(promises);
    }

    let workspaces = vscode.workspace.workspaceFolders;

    if (workspaces === undefined) {
        vscode.window.showErrorMessage('WPILib does not support single file');
        return;
    }

    let gradleProps: CppGradleProperties[] = [];
    let headerFinders: WpiLibHeaders[] = [];
    let cppProps: CppVsCodeProperties[] = [];

    let coreExports: IExternalAPI = coreExtension.exports;

    let gradleChannel = vscode.window.createOutputChannel('gradleCpp');

    // Create new header finders for every workspace
    for (let w of workspaces) {
        let p = coreExports.getPreferences(w);
        let gp = new CppGradleProperties(w, p, gradleChannel);
        let wh = new WpiLibHeaders(gp);
        let cp = new CppVsCodeProperties(w, gp, p);
        gradleProps.push(gp);
        headerFinders.push(wh);
        cppProps.push(cp);
    }

    // On a change in workspace folders, redo all header finders
    coreExports.onDidPreferencesFolderChanged((changed) => {
        // Nuke and reset
        // TODO: Remove existing header finders from the extension context
        for (let p of headerFinders) {
            p.dispose();
        }
        for (let p of gradleProps) {
            p.dispose();
        }

        for (let c of changed) {
            let gp = new CppGradleProperties(c.workspace, c.preference, gradleChannel);
            let wh = new WpiLibHeaders(gp);
            let cp = new CppVsCodeProperties(c.workspace, gp, c.preference);
            gradleProps.push(gp);
            headerFinders.push(wh);
            cppProps.push(cp);
        }

        context.subscriptions.push(...headerFinders);
        context.subscriptions.push(...gradleProps);
        context.subscriptions.push(...cppProps);
    });

    context.subscriptions.push(...headerFinders);
    context.subscriptions.push(...gradleProps);
    context.subscriptions.push(...cppProps);

    coreExports.addLanguageChoice('cpp');

    coreExports.registerCodeDeploy({
        async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
            let prefs = await coreExports.getPreferences(workspace);
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
        }
    });

    if (allowDebug) {
        coreExports.registerCodeDebug({
            async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
                let prefs = await coreExports.getPreferences(workspace);
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

                let properties = coreExports.getPreferences(workspace).getLanguageSpecific('cpp');

                if (properties !== undefined) {
                    if ('additionalDebugCommands' in properties.languageData
                        && properties.languageData.additionalDebugCommands instanceof Array) {
                        config.additionalCommands.push(...properties.languageData.additionalDebugCommands);
                    }
                }

                await startDebugging(config);

                console.log(result);
                return true;
            },
            getDisplayName(): string {
                return 'cpp';
            }
        });
    }

    context.subscriptions.push(vscode.commands.registerCommand('wpilibcpp.refreshProperties', () =>{
        for(let c of gradleProps) {
            c.runGradleRefresh();
        }
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}
