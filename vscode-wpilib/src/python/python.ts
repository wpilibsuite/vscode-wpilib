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
import { getRobotPyVersion, setupVenv } from '../pythondetector';

export async function activatePython(context: vscode.ExtensionContext, coreExports: IExternalAPI) {
  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'python');

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();
  const executeApi = coreExports.getExecuteAPI();
  const wp = await preferences.getFirstOrSelectedWorkspace();

  if (wp && preferences.getPreferences(wp).getIsRobotPyProject()) {
    if (!vscode.extensions.getExtension('astral-sh.ty')) {
      vscode.window.showWarningMessage(
        i18n('message', 'Could not find Python type-checking extension')
      );
    }

    const robotpyInstalled = (await getRobotPyVersion(wp.uri.fsPath)) !== undefined;
    let setupEnvironment = false;
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
      setupEnvironment = installReq?.title === i18n('ui', 'Yes');
    }
    if (setupEnvironment) {
      await setupVenv(executeApi, wp);
    }
  }

  registerCodeBuilderAndTester(coreExports);

  registerCodeDeploy(coreExports);

  await registerCommandTemplates(extensionResourceLocation, commandApi, preferences);

  await registerExamples(extensionResourceLocation, 'python', exampleTemplate);
  await registerProjectTemplates(extensionResourceLocation, 'python', exampleTemplate);
}
