'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { IExecuteAPI, IExternalAPI, IPreferencesAPI } from '../api';
import { localize as i18n } from '../locale';
import { registerExamples } from '../shared/examples';
import { registerProjectTemplates } from '../shared/templates';
import { registerCodeBuilderAndTester } from './buildtest';
import { registerCommandTemplates } from './commands';
import { registerCodeDeploy } from './deploy';
import { getRobotPyVersion, setupVenv } from '../pythondetector';

async function offerRobotPySetup(preferences: IPreferencesAPI, executeApi: IExecuteAPI) {
const robotPyFolders = (vscode.workspace.workspaceFolders ?? []).filter((folder) =>
    preferences.getPreferences(folder).getIsRobotPyProject()
  );
  if (robotPyFolders.length === 0) {
    return;
  }

  if (!vscode.extensions.getExtension('astral-sh.ty')) {
    vscode.window.showWarningMessage(
      i18n('message', 'Could not find Python type-checking extension')
    );
  }

  for (const wp of robotPyFolders) {
    if ((await getRobotPyVersion(wp.uri.fsPath)) !== undefined) {
      continue;
    }
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
      await setupVenv(executeApi, wp);
    }
  }
}

export async function activatePython(context: vscode.ExtensionContext, coreExports: IExternalAPI) {
  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'python');

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();
  const executeApi = coreExports.getExecuteAPI();

  registerCodeBuilderAndTester(coreExports);

  registerCodeDeploy(coreExports);

  await registerCommandTemplates(extensionResourceLocation, commandApi, preferences);

  await registerExamples(extensionResourceLocation, 'python', exampleTemplate);
  await registerProjectTemplates(extensionResourceLocation, 'python', exampleTemplate);

  await offerRobotPySetup(preferences, executeApi);
}
