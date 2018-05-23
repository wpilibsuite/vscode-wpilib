'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI } from '../shared/externalapi';
import { ApiProvider } from './apiprovider';
import { CppToolsApi } from './cppextensionapi';
import { setExtensionContext } from './persistentState';
import { createCommands } from './vscommands';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateCppProvider(context: vscode.ExtensionContext, coreExports: IExternalAPI): Promise<void> {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "gradle-vscode-cpp" is now active!');

    setExtensionContext(context);

    const workspaces = vscode.workspace.workspaceFolders;

    const vsCppExt = vscode.extensions.getExtension<CppToolsApi>('ms-vscode.cpptools');
    if (vsCppExt === undefined) {
        console.log('failure todo');
        return;
    }

    if (!vsCppExt.isActive) {
        await vsCppExt.activate();
    }

    const cppToolsApi: CppToolsApi = vsCppExt.exports;

    const configLoaders: ApiProvider[] = [];

    const preferences = coreExports.getPreferencesAPI();

    if (workspaces !== undefined) {
        for (const wp of workspaces) {
            const configLoader = new ApiProvider(wp, cppToolsApi, preferences);
            context.subscriptions.push(configLoader);
            configLoaders.push(configLoader);
        }
    }

    createCommands(context, configLoaders);
}
