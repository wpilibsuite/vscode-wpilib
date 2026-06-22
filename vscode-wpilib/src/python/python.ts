'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from '../api';
import { localize as i18n } from '../locale';
import { registerExamples } from '../shared/examples';
import { registerProjectTemplates } from '../shared/templates';
import { registerCodeBuilderAndTester } from './buildtest';
import { registerCommandTemplates } from './commands';
import { registerCodeDeploy } from './deploy';

export async function activatePython(context: vscode.ExtensionContext, coreExports: IExternalAPI) {
    const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'python');
    
    const preferences = coreExports.getPreferencesAPI()
    const exampleTemplate = coreExports.getExampleTemplateAPI();
    const commandApi = coreExports.getCommandAPI();

    let allowDebug = true;

    const pythonExtension = vscode.extensions.getExtension('ms-python.python');
    if(!pythonExtension) {
        vscode.window.showWarningMessage(
            i18n('message', 'Could not find python extension')
        );
    }
    const pyDebugger = vscode.extensions.getExtension('ms-python.debugpy');
    if(!pyDebugger) {
        vscode.window.showWarningMessage(
            i18n('message', 'Could not find Python Debugger Extension. Debugging is disabled')
        );
        allowDebug = false;
    }
    
    //Setup build and test
    registerCodeBuilderAndTester(coreExports);
    
    //Setup debug and deploy
    registerCodeDeploy(coreExports, allowDebug);
    
    //Setup commands
    await registerCommandTemplates(extensionResourceLocation, commandApi, preferences);
    
    //Setup examples and template
    await registerExamples(extensionResourceLocation, 'python', exampleTemplate);
    await registerProjectTemplates(extensionResourceLocation, 'python', exampleTemplate);
}
