'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { IExternalAPI } from '../api';
import { localize as i18n } from '../locale';
import { registerExamples } from '../shared/examples';
import { registerProjectTemplates } from '../shared/templates';
import { registerCodeBuilderAndTester } from './buildtest';
import { registerCommandTemplates } from './commands';
import { registerCodeDeploy } from './deploy';
import { getIsWindows } from '../utilities';

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
    let cmd = 'pip show robotpy';
    let robotpyInstalled = false;
    if(getIsWindows()) cmd = 'py -3 -m ' + cmd;
    try {
        let result = cp.execSync(cmd);
        if(result.indexOf("not found: robotpy") === -1) {
            robotpyInstalled = true;
        }
    } catch(err) {
        robotpyInstalled = false;
    }
    if(!robotpyInstalled) {
        const installReq = await vscode.window.showWarningMessage(
            i18n('message', 'Robotpy is not installed, if you would like to use the robotpy tools, ' +
                'you need to install robotpy. Would you like to install robotpy now?'
            ),
            {
                modal: true,
            },
            {title: i18n('ui', 'Yes')},
            {title: i18n('ui', 'No'), isCloseAffordance: true}
        );
        if(installReq?.title === i18n('ui', 'Yes')) {
            let installCmd = 'pip install --user robotpy';
            if(getIsWindows()) installCmd = 'py -3 -m ' + installCmd;
            cp.execSync(installCmd);
        }
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
