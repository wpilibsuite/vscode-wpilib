'use strict';

import * as vscode from 'vscode';
import { requestTeamNumber } from './preferences';
import { IExternalAPI } from './shared/externalapi';

export function createVsCommands(context: vscode.ExtensionContext, externalApi: IExternalAPI) {
  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startRioLog', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    await externalApi.getDeployDebugAPI().startRioLog(await preferences.getTeamNumber(), true);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.openCommandPalette', async () => {
    await vscode.commands.executeCommand('workbench.action.quickOpen', '>WPILib');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setTeamNumber(await requestTeamNumber(), request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.startTool', async () => {
    await externalApi.getToolAPI().startTool();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.deployCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot deploy code in an empty workspace');
      return;
    }
    await externalApi.getDeployDebugAPI().deployCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.debugCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot debug code in an empty workspace');
      return;
    }
    await externalApi.getDeployDebugAPI().debugCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.simulateCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    await externalApi.getDeployDebugAPI().simulateCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.testCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    await externalApi.getBuildTestAPI().testCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.buildCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    await externalApi.getBuildTestAPI().buildCode(workspace, source);
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
    await preferences.setCurrentLanguage(result);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setSkipTests', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set skip tests in an empty workspace');
      return;
    }

    const result = await vscode.window.showInformationMessage('Skip tests on deploy?', 'Yes', 'No');
    if (result === undefined) {
      console.log('Invalid selection for settting skip tests');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setSkipTests(result === 'Yes', request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setOnline', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set online in an empty workspace');
      return;
    }

    const result = await vscode.window.showInformationMessage('Run commands in Online mode?', 'Yes', 'No');
    if (result === undefined) {
      console.log('Invalid selection for settting online');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setOnline(result === 'Yes', request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStopSimulationOnEntry', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set stop simulation in an empty workspace');
      return;
    }

    const result = await vscode.window.showInformationMessage('Stop simulation debugging on entry?', 'Yes', 'No');
    if (result === undefined) {
      console.log('Invalid selection for settting stop simulation on entry');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setStopSimulationOnEntry(result === 'Yes', request === 'Globally');
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
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setAutoSaveOnDeploy(result === 'Yes', request === 'Globally');
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
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setAutoStartRioLog(result === 'Yes', request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createExample', async () => {
    await externalApi.getExampleTemplateAPI().createExample();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createTemplate', async () => {
    await externalApi.getExampleTemplateAPI().createTemplate();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.cancelTasks', async () => {
    await externalApi.getExecuteAPI().cancelCommands();
  }));
}
