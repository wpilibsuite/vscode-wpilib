'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { activateCppProvider } from '../cppprovider/cppprovider';
import { Examples } from '../examples';
import { Templates } from '../templates';
import { BuildTest } from './buildtest';
import { Commands } from './commands';
import { DeployDebug } from './deploydebug';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateCpp(context: vscode.ExtensionContext, coreExports: IExternalAPI) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'cpp');

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();

  let allowDebug = true;

  const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
  if (cppExtension === undefined) {
    // TODO: Make this a visible warning message when project detected is cpp
    console.log('Could not find cpptools C++ extension. Debugging is disabled.');
    allowDebug = false;
  }

  await activateCppProvider(context, coreExports);

  // Setup build and test

  const buildTest = new BuildTest(coreExports);

  context.subscriptions.push(buildTest);

  const deployDebug = new DeployDebug(coreExports, allowDebug);
  context.subscriptions.push(deployDebug);

  // Setup commands
  const commands: Commands = new Commands(extensionResourceLocation, commandApi, preferences);
  context.subscriptions.push(commands);

  // Setup examples and template
  const examples: Examples = new Examples(extensionResourceLocation, false, exampleTemplate);
  context.subscriptions.push(examples);
  const templates: Templates = new Templates(extensionResourceLocation, false, exampleTemplate);
  context.subscriptions.push(templates);
}
