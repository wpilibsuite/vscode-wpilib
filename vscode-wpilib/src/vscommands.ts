'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { getMainLogFile, logger } from './logger';
import { requestTeamNumber } from './preferences';
import { ToolAPI } from './toolapi';
import { gradleRun, javaHome, promisifyExists, setDesktopEnabled } from './utilities';
import { WPILibUpdates } from './wpilibupdates';

// Most of our commands are created here.
// To create a command, use vscode.commands.registerCommand with the name of the command
// and a function to call. This function can either take nothing, or a vscode.Uri if
// the command is expected to be called on a context menu.
// Make sure to push the created command into context.subscriptions
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
    await vscode.commands.executeCommand('workbench.action.quickOpen', '>WPILib ');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const teamNumber = await requestTeamNumber();
    if (teamNumber < 0) {
      return;
    }
    await preferences.setTeamNumber(teamNumber);
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
      vscode.window.showInformationMessage('Cannot simulate number in an empty workspace');
      return;
    }
    await externalApi.getDeployDebugAPI().simulateCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.testCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot start tests in an empty workspace');
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

    const deployDebugApi = externalApi.getDeployDebugAPI();

    if (deployDebugApi.getLanguageChoices().length <= 0) {
      await vscode.window.showInformationMessage('No languages available to add');
    }
    const result = await vscode.window.showQuickPick(deployDebugApi.getLanguageChoices(), { placeHolder: 'Pick a language' });
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
      logger.log('Invalid selection for settting skip tests');
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
      logger.log('Invalid selection for settting online');
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
      logger.log('Invalid selection for settting stop simulation on entry');
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
      logger.log('failed to set automatically save on deploy');
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
      logger.log('Invalid selection for riolog on deploy');
      return;
    }
    const preferences = preferencesApi.getPreferences(workspace);
    const request = await vscode.window.showInformationMessage('Save globally or project level?', 'Globally', 'Project');
    if (request === undefined) {
      return;
    }
    await preferences.setAutoStartRioLog(result === 'Yes', request === 'Globally');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.cancelTasks', async () => {
    await externalApi.getExecuteAPI().cancelCommands();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setJavaHome', async () => {
    if (javaHome === '') {
      return;
    }
    const selection = await vscode.window.showInformationMessage('Set in project or globally?', 'Project', 'Global');
    if (selection !== undefined) {
      if (selection === 'Project') {
        const wp = await externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
        if (wp === undefined) {
          vscode.window.showInformationMessage('Cannot set java on empty workspace');
          return;
        }
        const javaConfig = vscode.workspace.getConfiguration('java', wp.uri);
        await javaConfig.update('home', javaHome, vscode.ConfigurationTarget.WorkspaceFolder);
      } else {
        const javaConfig = vscode.workspace.getConfiguration('java');
        await javaConfig.update('home', javaHome, vscode.ConfigurationTarget.Global);
      }
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.installGradleTools', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot install gradle tools with an empty workspace');
      return;
    }
    await ToolAPI.InstallToolsFromGradle(workspace, externalApi);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.showLogFolder', async () => {
    let mainLog = getMainLogFile();
    if (!await promisifyExists(mainLog)) {
      mainLog = path.dirname(mainLog);
    }
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(mainLog));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.runGradleCommand', async () => {
    const command = await vscode.window.showInputBox({
      placeHolder: 'command',
      prompt: 'Enter Gradle command to run',
    });
    if (command === undefined) {
      return;
    }
    const wp = await externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      vscode.window.showInformationMessage('Cannot run command on empty workspace');
      return;
    }
    const prefs = externalApi.getPreferencesAPI().getPreferences(wp);
    const result = await gradleRun(command, wp.uri.fsPath, wp, 'Gradle Command', externalApi.getExecuteAPI(), prefs);
    if (result !== 0) {
      vscode.window.showInformationMessage(`Command (${command}) returned code: ${result}`);
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.resetAutoUpdate', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot reset auto update with an empty workspace');
      return;
    }
    const persistState = WPILibUpdates.getUpdatePersistentState(workspace);
    persistState.Value = false;
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.changeDesktop', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot change desktop with an empty workspace');
      return;
    }

    const result = await vscode.window.showInformationMessage('Enable Desktop Support for Project?', 'Yes', 'No');
    if (result === undefined) {
      logger.log('Invalid selection for desktop project support');
      return;
    }

    const selection = result === 'Yes';

    const buildgradle = path.join(workspace.uri.fsPath, 'build.gradle');

    if (await promisifyExists(buildgradle)) {
      await setDesktopEnabled(buildgradle, selection);
    } else {
      logger.log('build.gradle not found at: ', buildgradle);
    }
  }));
}
