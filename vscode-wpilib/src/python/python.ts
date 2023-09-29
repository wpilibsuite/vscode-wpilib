'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { DeployDebug } from './deploydebug';

export async function activatePython(context: vscode.ExtensionContext, coreExports: IExternalAPI) {

    const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'python');

    const preferences = coreExports.getPreferencesAPI();
    const exampleTemplate = coreExports.getExampleTemplateAPI();
    const commandApi = coreExports.getCommandAPI();

    const deployDebug = new DeployDebug(coreExports);
    context.subscriptions.push(deployDebug);


}
