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
import { setupVenv } from '../pythondetector';

export async function activatePython(context: vscode.ExtensionContext, coreExports: IExternalAPI) {
  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'python');

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();
  const executeApi = coreExports.getExecuteAPI();
  let allowDebug = true;
  const wp = await preferences.getFirstOrSelectedWorkspace();

  const pythonExtension = vscode.extensions.getExtension('the0807.uv-toolkit');
  if (!pythonExtension) {
    vscode.window.showWarningMessage(i18n('message', 'Could not find python package manager'));
  }
  const pyDebugger = vscode.extensions.getExtension('astral-sh.ty');
  if (!pyDebugger) {
    vscode.window.showWarningMessage(
      i18n('message', 'Could not find Python Debugger Extension. Debugging is disabled')
    );
    allowDebug = false;
  }

  if (wp && preferences.getPreferences(wp).getIsRobotPyProject()) {
    const cmd = 'uv pip list | findstr robotpy';
    let robotpyInstalled = false;
    try {
      const result = cp.execSync(cmd, { encoding: 'utf8', cwd: wp.uri.fsPath });
      if (result.indexOf('robotpy') !== -1) {
        robotpyInstalled = true;
      }
    } catch (err) {
      robotpyInstalled = false;
    }
    if (!robotpyInstalled) {
      const installReq = await vscode.window.showWarningMessage(
        i18n(
          'message',
          'Robotpy is not installed, if you would like to use the robotpy tools, ' +
            'you need to install robotpy. Would you like to install robotpy now?'
        ),
        {
          modal: true,
        },
        { title: i18n('ui', 'Yes') },
        { title: i18n('ui', 'No'), isCloseAffordance: true }
      );
      if (installReq?.title === i18n('ui', 'Yes')) {
        const installCmd = 'uv pip install robotpy --prerelease=allow';
        cp.execSync(installCmd, { cwd: wp.uri.fsPath });
      }
    }
    await setupVenv(executeApi, wp);
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
