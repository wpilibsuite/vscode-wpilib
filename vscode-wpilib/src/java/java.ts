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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateJava(context: vscode.ExtensionContext, coreExports: IExternalAPI) {

  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'java');

  let allowDebug = true;

  const javaExtension = vscode.extensions.getExtension('vscjava.vscode-java-debug');
  if (javaExtension === undefined) {
    // TODO: Make this a visible warning message when project detected is java
    console.log('Could not find java extension. Debugging is disabled.');
    allowDebug = false;
  }

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();

  // Setup build and test

  const buildTest = new BuildTest(coreExports);

  context.subscriptions.push(buildTest);

  // Setup debug and deploy
  const debugDeploy = new DebugDeploy(coreExports, allowDebug);
  context.subscriptions.push(debugDeploy);

  // Setup commands
  const commands: Commands = new Commands(extensionResourceLocation, commandApi, preferences);
  context.subscriptions.push(commands);

  // Setup examples and template
  const examples: Examples = new Examples(extensionResourceLocation, true, exampleTemplate);
  context.subscriptions.push(examples);
  const templates: Templates = new Templates(extensionResourceLocation, true, exampleTemplate);
  context.subscriptions.push(templates);
}
