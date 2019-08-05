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
import { Commands } from './commands';
import { DeployDebug } from './deploydebug';
import { getCodeLensRunCommand, getCodeLensTestCommand } from './simulate';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activateJava(context: vscode.ExtensionContext, coreExports: IExternalAPI): Promise<void> {

  const extensionResourceLocation = path.join(context.extensionPath, 'resources', 'java');

  const preferences = coreExports.getPreferencesAPI();
  const exampleTemplate = coreExports.getExampleTemplateAPI();
  const commandApi = coreExports.getCommandAPI();

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

  // Setup commands
  const commands: Commands = new Commands(extensionResourceLocation, commandApi, preferences);
  context.subscriptions.push(commands);

  // Setup examples and template
  const examples: Examples = new Examples(extensionResourceLocation, true, exampleTemplate);
  context.subscriptions.push(examples);
  const templates: Templates = new Templates(extensionResourceLocation, true, exampleTemplate);
  context.subscriptions.push(templates);

  // Setup java run debug configuration
  context.subscriptions.push(vscode.commands.registerCommand('wpilibjava.setupRunDebugButtons', async () => {
    const preferencesApi = coreExports.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot enable simulation with an empty workspace');
      return;
    }
    const teamNumber = await preferencesApi.getPreferences(workspace).getTeamNumber();
    const simInfo = await deployDebug.getSimulator().getSimulationInformation(teamNumber, workspace, undefined);

    if (simInfo === undefined) {
      return;
    }

    const config = vscode.workspace.getConfiguration('launch', workspace.uri);
    const testConfig = vscode.workspace.getConfiguration('java.test', workspace.uri);

    // tslint:disable-next-line:no-any
    const testValues: any[] | undefined = testConfig.get<any[] | undefined>('config', undefined);
    const has = testConfig.has('config');

    // This is broken, getting proxy objects. Need to figure out what is going on.
    if (testValues === undefined || !has) {
      testConfig.update('config', [await getCodeLensTestCommand(simInfo)]);
    } else {
      let found = false;
      for (let i = 0; i < testValues.length; i++) {
        // tslint:disable-next-line: no-unsafe-any
        if (testValues[i].name === 'WPILib Configuration') {
          testValues[i] = await getCodeLensTestCommand(simInfo);
          testConfig.update('config', testValues);
          found = true;
          break;
        }
      }
      if (!found) {
        testValues.push(await getCodeLensTestCommand(simInfo));
        testConfig.update('config', testValues);
      }
    }

    // tslint:disable-next-line:no-any
    const values: any[] | undefined = config.get('configurations');

    if (values === undefined) {
      config.update('configurations', [await getCodeLensRunCommand(simInfo)]);
    } else {
      values.push(await getCodeLensRunCommand(simInfo));
      config.update('configurations', values);
    }
}));

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
