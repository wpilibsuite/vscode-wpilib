'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI } from './externalapi';
import { DebugCommands, startDebugging } from './debug';
import { gradleRun, OutputPair } from './gradle';
import * as path from 'path';

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
export async function activate(_: vscode.ExtensionContext) {

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

    let coreExports: IExternalAPI = coreExtension.exports;

    let gradleChannel = vscode.window.createOutputChannel('gradleCpp');

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
                    soLibPath: soPath
                };

                await startDebugging(config);

                console.log(result);
                return true;
            },
            getDisplayName(): string {
                return 'cpp';
            }
        });
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
