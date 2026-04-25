'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from '../api';
import { activateCppProvider } from '../cppprovider/cppprovider';
import { localize as i18n } from '../locale';
import { registerExamples } from '../shared/examples';
import { registerProjectTemplates } from '../shared/templates';
import { registerCodeBuilderAndTester } from './buildtest';
import { registerCommandTemplates } from './commands';
import { registerCodeDeployerAndDebugger } from './deploydebug';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateCpp(context: vscode.ExtensionContext, coreExports: IExternalAPI) {
  // Use the console to output diagnostic information (logger.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'cpp');

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();

  let allowDebug = true;

  const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
  if (cppExtension === undefined) {
    vscode.window.showWarningMessage(
      i18n('message', 'Could not find cpptools C++ extension. Debugging is disabled.')
    );
    allowDebug = false;
  }

  await activateCppProvider(context, coreExports);

  // Setup build and test
  registerCodeBuilderAndTester(coreExports);
  registerCodeDeployerAndDebugger(coreExports, allowDebug);

  // Setup commands
  registerCommandTemplates(extensionResourceLocation, commandApi, preferences);

  // Setup examples and template
  registerExamples(extensionResourceLocation, false, exampleTemplate);
  registerProjectTemplates(extensionResourceLocation, false, exampleTemplate);
}
