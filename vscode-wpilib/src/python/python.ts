'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { DeployDebug } from './deploydebug';
import { logger } from '../logger';
import { IExternalAPIEx } from '../extension';
import { PyPreferencesAPI } from './pypreferencesapi';

export async function activatePython(context: vscode.ExtensionContext, coreExports: IExternalAPIEx) {

    const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'python');

    const preferences = coreExports.getPreferencesAPI();
    const exampleTemplate = coreExports.getExampleTemplateAPI();
    const commandApi = coreExports.getCommandAPI();

    const pythonExtension = vscode.extensions.getExtension('ms-python.python');
    if (pythonExtension === undefined) {
        logger.log('Could not find python extension. Python deployment and debugging is disabled');
        return;
    }

    const pyPrefs: PyPreferencesAPI = new PyPreferencesAPI();

    const deployDebug = new DeployDebug(coreExports, pyPrefs);
    context.subscriptions.push(deployDebug);


}
