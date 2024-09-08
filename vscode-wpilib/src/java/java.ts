'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { logger } from '../logger';
import { Examples } from '../shared/examples';
import { Templates } from '../shared/templates';
import { existsAsync } from '../utilities';
import { onVendorDepsChanged } from '../vendorlibraries';
import { BuildTest } from './buildtest';
import { DeployDebug } from './deploydebug';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateJava(context: vscode.ExtensionContext, coreExports: IExternalAPI) {

  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'java');

  const exampleTemplate = coreExports.getExampleTemplateAPI();

  let allowDebug = true;

  const javaDebugExtension = vscode.extensions.getExtension('vscjava.vscode-java-debug');
  if (javaDebugExtension === undefined) {
    // TODO: Make this a visible warning message when project detected is java
    logger.log('Could not find java extension. Debugging is disabled.');
    allowDebug = false;
  }

  // Setup build and test

  const buildTest = new BuildTest(coreExports);

  context.subscriptions.push(buildTest);

  // Setup debug and deploy
  const deployDebug = new DeployDebug(coreExports, allowDebug);
  context.subscriptions.push(deployDebug);

  // Setup examples and template
  const examples: Examples = new Examples(extensionResourceLocation, true, exampleTemplate);
  context.subscriptions.push(examples);
  const templates: Templates = new Templates(extensionResourceLocation, true, exampleTemplate);
  context.subscriptions.push(templates);

  if (vscode.extensions.getExtension('redhat.java') !== undefined) {
    // Add handlers for each workspace if java is installed
    const wp = vscode.workspace.workspaceFolders;
    if (wp) {
      for (const w of wp) {
        const prefs = coreExports.getPreferencesAPI().getPreferences(w);
        if (prefs.getIsWPILibProject()) {
          const localW = w;
          const buildGradle = path.join(localW.uri.fsPath, 'build.gradle');
          if (await existsAsync(buildGradle)) {
            const buildGradleUri = vscode.Uri.file(buildGradle);
            onVendorDepsChanged(async (workspace) => {
              if (workspace.index === localW.index) {
                await vscode.commands.executeCommand('java.projectConfiguration.update', buildGradleUri);
              }
            }, null, context.subscriptions);
          }
        }
      }
    }
  }
}
