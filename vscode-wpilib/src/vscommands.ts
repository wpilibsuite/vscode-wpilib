'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { getMainLogFile, logger } from './logger';
import { requestTeamNumber } from './preferences';
import { setDesktopEnabled } from './shared/generator';
import { ToolAPI } from './toolapi';
import { getDesktopEnabled, gradleRun, javaHome, promisifyExists } from './utilities';
import { WPILibUpdates } from './wpilibupdates';

interface IUpdatePair {
  yes: boolean;
  global: boolean;
}

class UpdatePair implements IUpdatePair, vscode.MessageItem {
  public title: string;
  public isCloseAffordance: boolean = true;
  public yes: boolean;
  public global: boolean;

  public constructor(title: string, yes: boolean, global: boolean) {
    this.title = title;
    this.yes = yes;
    this.global = global;
  }
}

async function globalProjectSettingUpdate(message: string): Promise<IUpdatePair | undefined> {
  const opts: UpdatePair[] = [
    new UpdatePair('Yes (Project)', true, false),
    new UpdatePair('Yes (Global)', true, true),
    new UpdatePair('No (Project)', false, false),
    new UpdatePair('No (Global)', false, true),
    new UpdatePair('Cancel', false, false),
  ];

  const result = await vscode.window.showInformationMessage<UpdatePair>(message, {modal: true}, ...opts);

  if (result !== undefined && result.title === 'Cancel') {
    return undefined;
  }

  return result;
}

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
      vscode.window.showInformationMessage('Must select a folder to create a command');
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
      vscode.window.showInformationMessage('Cannot set language in an empty workspace');
      return;
    }

    const deployDebugApi = externalApi.getDeployDebugAPI();

    if (deployDebugApi.getLanguageChoices().length <= 0) {
      vscode.window.showInformationMessage('No languages available to set');
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await vscode.window.showQuickPick(deployDebugApi.getLanguageChoices(),
      { placeHolder: `Pick a language (Currently ${preferences.getCurrentLanguage()})` });
    if (result === undefined) {
      return;
    }

    await preferences.setCurrentLanguage(result);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setSkipTests', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set skip tests in an empty workspace');
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(`Skip tests on deploy? Currently ${preferences.getSkipTests()}`);
    if (result === undefined) {
      logger.log('Invalid selection for settting skip tests');
      return;
    }

    await preferences.setSkipTests(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setOnline', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set online in an empty workspace');
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(`Run commands in Online mode? Currently ${preferences.getOnline()}`);
    if (result === undefined) {
      logger.log('Invalid selection for settting online');
      return;
    }

    await preferences.setOnline(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setDeployOnline', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set deploy online in an empty workspace');
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(`Run deploy command in Online mode? Currently ${preferences.getDeployOnline()}`);
    if (result === undefined) {
      logger.log('Invalid selection for settting deploy online');
      return;
    }

    await preferences.setDeployOnline(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStopSimulationOnEntry', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set stop simulation in an empty workspace');
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(`Stop simulation debugging on entry? Currently ${preferences.getStopSimulationOnEntry()}`);
    if (result === undefined) {
      logger.log('Invalid selection for settting stop simulation on entry');
      return;
    }

    await preferences.setStopSimulationOnEntry(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setAutoSave', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(`Automatically save on deploy? Currently ${preferences.getAutoSaveOnDeploy()}`);
    if (result === undefined) {
      logger.log('failed to set automatically save on deploy');
      return;
    }

    await preferences.setAutoSaveOnDeploy(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStartRioLog', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('Cannot set team number in an empty workspace');
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(`Automatically start RioLog on deploy? Currently ${preferences.getAutoStartRioLog()}`);
    if (result === undefined) {
      logger.log('Invalid selection for riolog on deploy');
      return;
    }

    await preferences.setAutoStartRioLog(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.cancelTasks', async () => {
    await externalApi.getExecuteAPI().cancelCommands();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setJavaHome', async () => {
    if (javaHome === '') {
      return;
    }
    const selection = await vscode.window.showInformationMessage('Set in project or globally?', {modal: true}, 'Project', 'Global');
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

    const buildgradle = path.join(workspace.uri.fsPath, 'build.gradle');

    if (!await promisifyExists(buildgradle)) {
      logger.log('build.gradle not found at: ', buildgradle);
      return;
    }

    const isEnabled = await getDesktopEnabled(buildgradle);

    if (isEnabled === undefined) {
      vscode.window.showInformationMessage('Invalid project format to add or remove desktop support.');
      return;
    }

    const result = await vscode.window.showInformationMessage(`Enable Desktop Support for Project? Currently ${isEnabled}`,
      {modal: true}, 'Yes', 'No');
    if (result === undefined) {
      logger.log('Invalid selection for desktop project support');
      return;
    }

    const selection = result === 'Yes';

    await setDesktopEnabled(buildgradle, selection);
  }));
}
