'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { downloadDocs } from './docsapi';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { requestTeamNumber } from './preferences';
import { setDesktopEnabled } from './shared/generator';
import { ToolAPI } from './toolapi';
import { existsAsync, getDesktopEnabled, gradleRun, javaHome } from './utilities';
import { WPILibUpdates } from './wpilibupdates';

interface IUpdatePair {
  yes: boolean;
  global: boolean;
}

class UpdatePair implements IUpdatePair, vscode.MessageItem {
  public title: string;
  public isCloseAffordance: boolean;
  public yes: boolean;
  public global: boolean;

  public constructor(title: string, yes: boolean, global: boolean, close: boolean) {
    this.title = title;
    this.yes = yes;
    this.global = global;
    this.isCloseAffordance = close;
  }
}

async function globalProjectSettingUpdate(message: string): Promise<IUpdatePair | undefined> {
  const opts: UpdatePair[] = [
    new UpdatePair(i18n('ui', 'Yes (Project)'), true, false, false),
    new UpdatePair(i18n('ui', 'Yes (Global)'), true, true, false),
    new UpdatePair(i18n('ui', 'No (Project)'), false, false, false),
    new UpdatePair(i18n('ui', 'No (Global)'), false, true, false),
    new UpdatePair(i18n('ui', 'Cancel'), false, false, true),
  ];

  const result = await vscode.window.showInformationMessage<UpdatePair>(message, {modal: true}, ...opts);

  if (result !== undefined && result.title === i18n('ui', 'Cancel')) {
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

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set team number in an empty workspace'));
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
      vscode.window.showInformationMessage(i18n('message', 'Cannot deploy code in an empty workspace'));
      return;
    }
    await externalApi.getDeployDebugAPI().deployCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.debugCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot debug code in an empty workspace'));
      return;
    }
    await externalApi.getDeployDebugAPI().debugCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.simulateCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot simulate code in an empty workspace'));
      return;
    }
    await externalApi.getDeployDebugAPI().simulateCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.simulateHwCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot simulate code in an empty workspace'));
      return;
    }
    await externalApi.getDeployDebugAPI().simulateCode(workspace, source, '-PhwSim');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.testCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot start tests in an empty workspace'));
      return;
    }
    await externalApi.getBuildTestAPI().testCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.buildCode', async (source: vscode.Uri | undefined) => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set team number in an empty workspace'));
      return;
    }
    await externalApi.getBuildTestAPI().buildCode(workspace, source);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.createCommand', async (arg: vscode.Uri | undefined) => {
    if (arg === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Must select a folder to create a command'));
      return;
    }
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot create command in an empty workspace'));
      return;
    }
    await externalApi.getCommandAPI().createCommand(workspace, arg);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setLanguage', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set language in an empty workspace'));
      return;
    }

    const deployDebugApi = externalApi.getDeployDebugAPI();

    if (deployDebugApi.getLanguageChoices().length <= 0) {
      vscode.window.showInformationMessage(i18n('message', 'No languages available to set'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await vscode.window.showQuickPick(deployDebugApi.getLanguageChoices(),
      { placeHolder: i18n('ui', 'Pick a language (Currently {0})', preferences.getCurrentLanguage()) });
    if (result === undefined) {
      return;
    }

    await preferences.setCurrentLanguage(result);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setSkipTests', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set skip tests in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message', 'Skip tests on deploy? Currently {0}', preferences.getSkipTests()));
    if (result === undefined) {
      logger.log('Invalid selection for setting skip tests');
      return;
    }

    await preferences.setSkipTests(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setSkipSelectSimulateExtension', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message',
        'Cannot set skip select simulate extension in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message',
      'Enable skipping of selection of simulation extensions? Currently {0}', preferences.getSelectDefaultSimulateExtension()));
    if (result === undefined) {
      logger.log('Invalid selection for skipping of selection of simulation extensions');
      return;
    }

    await preferences.setSkipSelectSimulateExtension(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setSelectDefaultSimulateExtension', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message',
        'Cannot set select default simulate extension in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message',
      'Enable selecting of all simulation extensions by default? Currently {0}', preferences.getSelectDefaultSimulateExtension()));
    if (result === undefined) {
      logger.log('Invalid selection for selection of all simulation extensions by default');
      return;
    }

    await preferences.setSelectDefaultSimulateExtension(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setOffline', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set offline in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message',
      'Run commands other then deploy in offline mode? Currently {0}', preferences.getOffline()));
    if (result === undefined) {
      logger.log('Invalid selection for setting offline');
      return;
    }

    await preferences.setOffline(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setDeployOffline', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set deploy offline in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message',
      'Run deploy command in offline mode? Currently {0}', preferences.getDeployOffline()));
    if (result === undefined) {
      logger.log('Invalid selection for setting deploy offline');
      return;
    }

    await preferences.setDeployOffline(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setStopSimulationOnEntry', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set stop simulation in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message',
      'Stop simulation debugging on entry? Currently {0}', preferences.getStopSimulationOnEntry()));
    if (result === undefined) {
      logger.log('Invalid selection for setting stop simulation on entry');
      return;
    }

    await preferences.setStopSimulationOnEntry(result.yes, result.global);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setUseWinDbgX', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set windbgx in an empty workspace'));
      return;
    }

    const wpConfiguration = vscode.workspace.getConfiguration('wpilib', workspace.uri);
    let res = wpConfiguration.get<boolean>('useWindbgX');
    if (res === undefined) {
      res = false;
    }

    const result = await globalProjectSettingUpdate(i18n('message',
      'Use WinDbg Preview (from store) for windows debugging? Currently {0}', res));
    if (result === undefined) {
      logger.log('Invalid selection for setting Use WinDbg Preview');
      return;
    }

    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!result.global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return wpConfiguration.update('useWindbgX', result.yes, target);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.setAutoSave', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot set auto save in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message',
      'Automatically save on deploy? Currently {0}', preferences.getAutoSaveOnDeploy()));
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
      vscode.window.showInformationMessage(i18n('message', 'Cannot set start RioLog in an empty workspace'));
      return;
    }

    const preferences = preferencesApi.getPreferences(workspace);

    const result = await globalProjectSettingUpdate(i18n('message',
      'Automatically start RioLog on deploy? Currently {0}', preferences.getAutoStartRioLog()));
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
    const javaConfig = vscode.workspace.getConfiguration('java');
    await javaConfig.update('jdt.ls.java.home', javaHome, vscode.ConfigurationTarget.Global);
    await vscode.window.showInformationMessage(i18n('message', 'Successfully set java.jdt.ls.java.home'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.installGradleTools', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot install gradle tools with an empty workspace'));
      return;
    }
    await ToolAPI.InstallToolsFromGradle(workspace, externalApi);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.runGradleCommand', async () => {
    const command = await vscode.window.showInputBox({
      placeHolder: 'command',
      prompt: i18n('message', 'Enter Gradle command to run'),
    });
    if (command === undefined) {
      return;
    }
    const wp = await externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot run command on empty workspace'));
      return;
    }
    const prefs = externalApi.getPreferencesAPI().getPreferences(wp);
    const result = await gradleRun(command, wp.uri.fsPath, wp, 'Gradle Command', externalApi.getExecuteAPI(), prefs);
    if (result !== 0) {
      vscode.window.showInformationMessage(i18n('message', 'Command ({0}) returned code: {1}', command, result));
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.resetAutoUpdate', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot reset auto update with an empty workspace'));
      return;
    }
    const persistState = WPILibUpdates.getUpdatePersistentState(workspace);
    persistState.Value = false;
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.changeDesktop', async () => {
    const preferencesApi = externalApi.getPreferencesAPI();
    const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot change desktop with an empty workspace'));
      return;
    }

    const buildgradle = path.join(workspace.uri.fsPath, 'build.gradle');

    if (!await existsAsync(buildgradle)) {
      logger.log('build.gradle not found at: ', buildgradle);
      return;
    }

    const isEnabled = await getDesktopEnabled(buildgradle);

    if (isEnabled === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Invalid project format to add or remove desktop support.'));
      return;
    }

    const result = await vscode.window.showInformationMessage(i18n('message', 'Enable Desktop Support for Project? Currently {0}', isEnabled),
      {modal: true}, i18n('ui', 'Yes'), i18n('ui', 'No'));
    if (result === undefined) {
      logger.log('Invalid selection for desktop project support');
      return;
    }

    const selection = result === i18n('ui', 'Yes');

    await setDesktopEnabled(buildgradle, selection);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.openApiDocumentation', async () => {
    const pick = await vscode.window.showQuickPick(['Java', 'C++'], {
      placeHolder: i18n('ui', 'Pick a language'),
    });
    const homeDir = externalApi.getUtilitiesAPI().getWPILibHomeDir();
    if (pick === 'Java') {
      const indexFile = path.join(homeDir, 'documentation', 'java', 'index.html');
      if (await existsAsync(indexFile)) {
        await vscode.env.openExternal(vscode.Uri.file(indexFile));
        return;
      } else {
        try {
          const downloadDir = await downloadDocs('https://frcmaven.wpi.edu/artifactory/release/edu/wpi/first/wpilibj/documentation/',
                                                 '.zip', path.join(homeDir, 'documentation'), 'java');
          if (downloadDir === undefined) {
            return;
          }
          await vscode.env.openExternal(vscode.Uri.file(indexFile));
        } catch (err) {
          logger.error('Error downloading item', err);
        }
      }
    } else if (pick === 'C++') {
      const indexFile = path.join(homeDir, 'documentation', 'cpp', 'index.html');
      if (await existsAsync(indexFile)) {
        await vscode.env.openExternal(vscode.Uri.file(indexFile));
        return;
      } else {
        try {
          const downloadDir = await downloadDocs('https://frcmaven.wpi.edu/artifactory/release/edu/wpi/first/wpilibc/documentation/',
                                                 '.zip', path.join(homeDir, 'documentation'), 'cpp');
          if (downloadDir === undefined) {
            return;
          }
          await vscode.env.openExternal(vscode.Uri.file(indexFile));
        } catch (err) {
          logger.error('Error downloading item', err);
        }
      }
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.runGradleClean', async () => {
    const wp = await externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Cannot run command on empty workspace'));
      return;
    }
    const prefs = externalApi.getPreferencesAPI().getPreferences(wp);
    const result = await gradleRun('clean', wp.uri.fsPath, wp, 'Gradle Command', externalApi.getExecuteAPI(), prefs);
    if (result !== 0) {
      vscode.window.showInformationMessage(i18n('message', 'Command ({0}) returned code: {1}', 'clean', result));
    }
  }));
}
