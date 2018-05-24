'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { Examples } from '../shared/examples';
import { IExternalAPI } from '../shared/externalapi';
import { Templates } from '../shared/templates';
import { BuildTest } from './buildtest';
import { Commands } from './commands';
import { DebugDeploy } from './debugdeploy';
// import { activateCppProvider } from '../cppprovider/cppprovider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateCpp(context: vscode.ExtensionContext, coreExports: IExternalAPI) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'cpp');

  let allowDebug = true;

  const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
  if (cppExtension === undefined) {
    // TODO: Make this a visible warning message when project detected is cpp
    console.log('Could not find cpptools C++ extension. Debugging is disabled.');
    allowDebug = false;
  } else if (!cppExtension.isActive) {
    await cppExtension.activate();
  }

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();

  // TODO: Waiting for update
  // await activateCppProvider(context, coreExports);

  // Setup build and test

  const buildTest = new BuildTest(coreExports);

  context.subscriptions.push(buildTest);

  const debugDeploy = new DebugDeploy(coreExports, allowDebug);
  context.subscriptions.push(debugDeploy);

  // Setup commands
  const commands: Commands = new Commands(extensionResourceLocation, commandApi, preferences);
  context.subscriptions.push(commands);

  // Setup examples and template
  const examples: Examples = new Examples(extensionResourceLocation, false, exampleTemplate);
  context.subscriptions.push(examples);
  const templates: Templates = new Templates(extensionResourceLocation, false, exampleTemplate);
  context.subscriptions.push(templates);
}
