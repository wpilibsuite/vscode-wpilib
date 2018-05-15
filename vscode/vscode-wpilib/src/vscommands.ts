'use strict';

import * as vscode from 'vscode';
import { IExternalAPI } from './shared/externalapi';
import { requestTeamNumber } from './preferences';

export function createVsCommands(context: vscode.ExtensionContext, externalApi: IExternalAPI) {
  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startRioLog', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return;
    }
    await externalApi.getDeployDebugAPI().startRioLog(await preferences.getTeamNumber(), true);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return;
    }
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setTeamNumber(await requestTeamNumber(), request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startTool', async () => {
    await externalApi.getToolAPI().startTool();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.deployCode', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    await externalApi.getDeployDebugAPI().deployCode(workspace);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.debugCode', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    await externalApi.getDeployDebugAPI().debugCode(workspace, false);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createCommand', async (arg: vscode.Uri | undefined) => {
    if (arg === undefined) {
      await vscode.window.showInformationMessage('Must select a folder to create a command');
      return;
    }
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot create command in an empty workspace');
      return;
    }
    await externalApi.getCommandAPI().createCommand(workspace, arg);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setLanguage', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }

    const debugDeployApi = externalApi.getDeployDebugAPI();

    if (debugDeployApi.getLanguageChoices().length <= 0) {
      await vscode.window.showInformationMessage('No languages available to add');
    }
    const result = await vscode.window.showQuickPick(debugDeployApi.getLanguageChoices(), { placeHolder: 'Pick a language' });
    if (result === undefined) {
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);
    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return;
    }
    preferences.setCurrentLanguage(result);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setAutoSave', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }

    const result = await vscode.window.showInformationMessage('Automatically save on deploy?', 'Yes', 'No');
    if (result === undefined) {
      console.log('failed to set automatically save on deploy');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return;
    }
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    preferences.setAutoSaveOnDeploy(result === 'Yes', request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStartRioLog', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }

    const result = await vscode.window.showInformationMessage('Automatically start RioLog on deploy?', 'Yes', 'No');
    if (result === undefined) {
      console.log('Invalid selection for riolog on deploy');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return;
    }
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    preferences.setAutoStartRioLog(result === 'Yes', request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createExample', async () => {
    await externalApi.getExampleTemplateAPI().createExample();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createTemplate', async () => {
    await externalApi.getExampleTemplateAPI().createTemplate();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.buildCode', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    await externalApi.getBuildTestAPI().buildCode(workspace);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.testCode', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    await externalApi.getBuildTestAPI().testCode(workspace);
  }));
}
