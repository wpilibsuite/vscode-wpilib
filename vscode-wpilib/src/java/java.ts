'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { access } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from '../api';
import { registerExamples } from '../shared/examples';
import { registerProjectTemplates } from '../shared/templates';
import { onVendorDepsChanged } from '../vendorlibraries';
import { registerCodeBuilderAndTester } from './buildtest';
import { registerCommandTemplates } from './commands';
import { registerCodeDeployerAndDebugger } from './deploydebug';
import { localize as i18n } from '../locale';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateJava(context: vscode.ExtensionContext, coreExports: IExternalAPI) {
  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'java');

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();

  let allowDebug = true;

  const javaDebugExtension = vscode.extensions.getExtension('vscjava.vscode-java-debug');
  if (javaDebugExtension === undefined) {
    vscode.window.showWarningMessage(
      i18n('message', 'Could not find Debugger for Java extension. Debugging is disabled.')
    );

    allowDebug = false;
  }

  // Setup build and test
  registerCodeBuilderAndTester(coreExports);

  // Setup debug and deploy
  registerCodeDeployerAndDebugger(coreExports, allowDebug);

  // Setup commands
  registerCommandTemplates(extensionResourceLocation, commandApi, preferences);

  // Setup examples and template
  registerExamples(extensionResourceLocation, true, exampleTemplate);
  registerProjectTemplates(extensionResourceLocation, true, exampleTemplate);

  if (vscode.extensions.getExtension('redhat.java')) {
    // Add handlers for each workspace if java is installed
    const wp = vscode.workspace.workspaceFolders;
    if (wp) {
      for (const w of wp) {
        const prefs = coreExports.getPreferencesAPI().getPreferences(w);
        if (prefs.getIsWPILibProject()) {
          const buildGradle = path.join(w.uri.fsPath, 'build.gradle');
          try {
            await access(buildGradle);
            const buildGradleUri = vscode.Uri.file(buildGradle);
            onVendorDepsChanged(
              async (workspace) => {
                if (workspace.index === w.index) {
                  await vscode.commands.executeCommand(
                    'java.projectConfiguration.update',
                    buildGradleUri
                  );
                }
              },
              null,
              context.subscriptions
            );
          } catch {
            // Ignore
          }
        }
      }
    }
  }
}
