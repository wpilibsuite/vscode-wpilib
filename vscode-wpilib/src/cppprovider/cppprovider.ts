'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { getCppToolsApi, Version } from 'vscode-cpptools';
import { IExternalAPI } from 'vscode-wpilibapi';
import { ApiProvider } from './apiprovider';
import { createCommands } from './vscommands';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateCppProvider(context: vscode.ExtensionContext, coreExports: IExternalAPI): Promise<void> {

    const resourceRoot = path.join(context.extensionPath, 'resources');

    const workspaces = vscode.workspace.workspaceFolders;

    const cppToolsApi = await getCppToolsApi(Version.v2);

    if (cppToolsApi) {
        context.subscriptions.push(cppToolsApi);

        const configLoaders: ApiProvider[] = [];

        if (workspaces !== undefined) {
            for (const wp of workspaces) {
                const prefs = coreExports.getPreferencesAPI().getPreferences(wp);
                if (prefs.getIsWPILibProject() && prefs.getEnableCppIntellisense()) {
                    const configLoader = new ApiProvider(wp, cppToolsApi, coreExports, resourceRoot);
                    context.subscriptions.push(configLoader);
                    configLoaders.push(configLoader);
                }
            }
        }

        createCommands(context, configLoaders);
    }
}
