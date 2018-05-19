'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { Examples } from '../shared/examples';
import { Templates } from '../shared/templates';
import { Commands } from './commands';
import { IExternalAPI } from '../shared/externalapi';
import { BuildTest } from './buildtest';
import { DebugDeploy } from './debugdeploy';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateCpp(context: vscode.ExtensionContext, coreExports: IExternalAPI) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'cpp');

  let allowDebug = true;

  const promises = [];

  const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
  if (cppExtension === undefined) {
    //TODO: Make this a visible warning message when project detected is cpp
    console.log('Could not find cpptools C++ extension. Debugging is disabled.');
    allowDebug = false;
  } else if (!cppExtension.isActive) {
    promises.push(cppExtension.activate());
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  const preferences = coreExports.getPreferencesAPI();
  const debugDeployApi = coreExports.getDeployDebugAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();
  const buildTestApi = coreExports.getBuildTestAPI();

  const gradleChannel = vscode.window.createOutputChannel('gradleCpp');

  // Setup build and test

  const buildTest = new BuildTest(buildTestApi, gradleChannel, preferences);

  context.subscriptions.push(buildTest);

  const debugDeploy = new DebugDeploy(debugDeployApi, preferences, gradleChannel, allowDebug);
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
