'use strict';

import { access } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { downloadDocs } from './docsapi';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { requestTeamNumber } from './preferences';
import { setDesktopEnabled } from './shared/generator';
import { ToolAPI } from './toolapi';
import { getDesktopEnabled, gradleRun, javaHome } from './utilities';
import { WPILibUpdates } from './wpilibupdates';

// Most of our commands are created here.
// To create a command, use vscode.commands.registerCommand with the name of the command
// and a function to call. This function can either take nothing, or a vscode.Uri if
// the command is expected to be called on a context menu.
// Make sure to push the created command into context.subscriptions
export function createVsCommands(context: vscode.ExtensionContext, externalApi: IExternalAPI) {
  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.startRioLog', async () => {
      const preferencesApi = externalApi.getPreferencesAPI();
      const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
      if (workspace === undefined) {
        return;
      }
      const preferences = preferencesApi.getPreferences(workspace);
      await externalApi.getDeployDebugAPI().startRioLog(await preferences.getTeamNumber(), true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.setTeamNumber', async () => {
      const preferencesApi = externalApi.getPreferencesAPI();
      const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
      if (
        workspace === undefined ||
        !preferencesApi.getPreferences(workspace).getIsWPILibProject()
      ) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot set team number since this is not a WPILib project')
        );
        return;
      }
      const preferences = preferencesApi.getPreferences(workspace);
      const teamNumber = await requestTeamNumber();
      if (teamNumber < 0) {
        return;
      }
      await preferences.setTeamNumber(teamNumber);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.startTool', async () => {
      await externalApi.getToolAPI().startTool();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'wpilibcore.deployCode',
      async (source: vscode.Uri | undefined) => {
        const preferencesApi = externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (
          workspace === undefined ||
          !preferencesApi.getPreferences(workspace).getIsWPILibProject()
        ) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot deploy code since this is not a WPILib project')
          );
          return;
        }
        await externalApi.getDeployDebugAPI().deployCode(workspace, source);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'wpilibcore.debugCode',
      async (source: vscode.Uri | undefined) => {
        const preferencesApi = externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (
          workspace === undefined ||
          !preferencesApi.getPreferences(workspace).getIsWPILibProject()
        ) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot debug code since this is not a WPILib project')
          );
          return;
        }
        await externalApi.getDeployDebugAPI().debugCode(workspace, source);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'wpilibcore.simulateCode',
      async (source: vscode.Uri | undefined) => {
        const preferencesApi = externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (
          workspace === undefined ||
          !preferencesApi.getPreferences(workspace).getIsWPILibProject()
        ) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot simulate code since this is not a WPILib project')
          );
          return;
        }
        await externalApi.getDeployDebugAPI().simulateCode(workspace, source);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'wpilibcore.simulateHwCode',
      async (source: vscode.Uri | undefined) => {
        const preferencesApi = externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (
          workspace === undefined ||
          !preferencesApi.getPreferences(workspace).getIsWPILibProject()
        ) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot simulate code since this is not a WPILib project')
          );
          return;
        }
        await externalApi.getDeployDebugAPI().simulateCode(workspace, source, '-PhwSim');
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'wpilibcore.testCode',
      async (source: vscode.Uri | undefined) => {
        const preferencesApi = externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (
          workspace === undefined ||
          !preferencesApi.getPreferences(workspace).getIsWPILibProject()
        ) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot start tests since this is not a WPILib project')
          );
          return;
        }
        await externalApi.getBuildTestAPI().testCode(workspace, source);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'wpilibcore.buildCode',
      async (source: vscode.Uri | undefined) => {
        const preferencesApi = externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (
          workspace === undefined ||
          !preferencesApi.getPreferences(workspace).getIsWPILibProject()
        ) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot build robot code since this is not a WPILib project')
          );
          return;
        }
        await externalApi.getBuildTestAPI().buildCode(workspace, source);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'wpilibcore.createCommand',
      async (arg: vscode.Uri | undefined) => {
        if (arg === undefined) {
          vscode.window.showInformationMessage(
            i18n('message', 'Must select a folder to create a command')
          );
          return;
        }
        const preferencesApi = externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (
          workspace === undefined ||
          !preferencesApi.getPreferences(workspace).getIsWPILibProject()
        ) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot create command since this is not a WPILib project')
          );
          return;
        }
        await externalApi.getCommandAPI().createCommand(workspace, arg);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.setLanguage', async () => {
      const preferencesApi = externalApi.getPreferencesAPI();
      const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
      if (
        workspace === undefined ||
        !preferencesApi.getPreferences(workspace).getIsWPILibProject()
      ) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot set language since this is not a WPILib project')
        );
        return;
      }

      const deployDebugApi = externalApi.getDeployDebugAPI();

      if (deployDebugApi.getLanguageChoices().length <= 0) {
        vscode.window.showInformationMessage(i18n('message', 'No languages available to set'));
        return;
      }

      const preferences = preferencesApi.getPreferences(workspace);

      const result = await vscode.window.showQuickPick(deployDebugApi.getLanguageChoices(), {
        placeHolder: i18n(
          'ui',
          'Pick a language (Currently {0})',
          preferences.getCurrentLanguage()
        ),
      });
      if (result === undefined) {
        return;
      }

      await preferences.setCurrentLanguage(result);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.cancelTasks', async () => {
      await externalApi.getExecuteAPI().cancelCommands();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.setJavaHome', async () => {
      if (javaHome === '') {
        return;
      }
      const javaConfig = vscode.workspace.getConfiguration('java');
      await javaConfig.update('jdt.ls.java.home', javaHome, vscode.ConfigurationTarget.Global);
      await vscode.window.showInformationMessage(
        i18n('message', 'Successfully set java.jdt.ls.java.home')
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.installGradleTools', async () => {
      const preferencesApi = externalApi.getPreferencesAPI();
      const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
      if (
        workspace === undefined ||
        !preferencesApi.getPreferences(workspace).getIsWPILibProject()
      ) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot install gradle tools since this is not a WPILib project')
        );
        return;
      }
      await ToolAPI.InstallToolsFromGradle(workspace, externalApi);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.runGradleCommand', async () => {
      const command = await vscode.window.showInputBox({
        placeHolder: 'command',
        prompt: i18n('message', 'Enter Gradle command to run'),
      });
      if (command === undefined) {
        return;
      }
      const wp = await externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
      if (
        wp === undefined ||
        !externalApi.getPreferencesAPI().getPreferences(wp).getIsWPILibProject()
      ) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot run gradle command since this is not a WPILib project')
        );
        return;
      }
      const prefs = externalApi.getPreferencesAPI().getPreferences(wp);
      const result = await gradleRun(
        command,
        wp.uri.fsPath,
        wp,
        'Gradle Command',
        externalApi.getExecuteAPI(),
        prefs
      );
      if (result !== 0) {
        vscode.window.showInformationMessage(
          i18n('message', 'Command ({0}) returned code: {1}', command, result)
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.resetAutoUpdate', async () => {
      const preferencesApi = externalApi.getPreferencesAPI();
      const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
      if (
        workspace === undefined ||
        !preferencesApi.getPreferences(workspace).getIsWPILibProject()
      ) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot reset auto update since this is not a WPILib project')
        );
        return;
      }
      const persistState = WPILibUpdates.getUpdatePersistentState(workspace);
      persistState.Value = false;
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.changeDesktop', async () => {
      const preferencesApi = externalApi.getPreferencesAPI();
      const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
      if (
        workspace === undefined ||
        !preferencesApi.getPreferences(workspace).getIsWPILibProject()
      ) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot change desktop since this is not a WPILib project')
        );
        return;
      }

      const buildgradle = path.join(workspace.uri.fsPath, 'build.gradle');

      try {
        await access(buildgradle);
      } catch {
        logger.log('build.gradle not found at: ', buildgradle);
        return;
      }

      const isEnabled = await getDesktopEnabled(buildgradle);

      if (isEnabled === undefined) {
        vscode.window.showInformationMessage(
          i18n('message', 'Invalid project format to use the "add or remove desktop support" option with; this option is only supported for C++ projects.')
        );
        return;
      }

      const result = await vscode.window.showInformationMessage(
        i18n('message', 'Enable Desktop Support for Project? Currently {0}', isEnabled),
        { modal: true },
        i18n('ui', 'Yes'),
        i18n('ui', 'No')
      );
      if (result === undefined) {
        logger.log('Invalid selection for desktop project support');
        return;
      }

      const selection = result === i18n('ui', 'Yes');

      await setDesktopEnabled(buildgradle, selection);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.openApiDocumentation', async () => {
      const pick = await vscode.window.showQuickPick(['Java', 'C++'], {
        placeHolder: i18n('ui', 'Pick a language'),
      });
      const homeDir = externalApi.getUtilitiesAPI().getWPILibHomeDir();
      if (pick === 'Java') {
        const indexFile = path.join(homeDir, 'documentation', 'java', 'index.html');
        try {
          await access(indexFile);
          await vscode.env.openExternal(vscode.Uri.file(indexFile));
          return;
        } catch {
          try {
            const downloadDir = await downloadDocs(
              'https://frcmaven.wpi.edu/artifactory/release/edu/wpi/first/wpilibj/documentation/',
              '.zip',
              path.join(homeDir, 'documentation'),
              'java'
            );
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
        try {
          await access(indexFile);
          await vscode.env.openExternal(vscode.Uri.file(indexFile));
          return;
        } catch {
          try {
            const downloadDir = await downloadDocs(
              'https://frcmaven.wpi.edu/artifactory/release/edu/wpi/first/wpilibc/documentation/',
              '.zip',
              path.join(homeDir, 'documentation'),
              'cpp'
            );
            if (downloadDir === undefined) {
              return;
            }
            await vscode.env.openExternal(vscode.Uri.file(indexFile));
          } catch (err) {
            logger.error('Error downloading item', err);
          }
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wpilibcore.runGradleClean', async () => {
      const wp = await externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
      if (
        wp === undefined ||
        !externalApi.getPreferencesAPI().getPreferences(wp).getIsWPILibProject()
      ) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot run gradle clean since this is not a WPILib project')
        );
        return;
      }
      const prefs = externalApi.getPreferencesAPI().getPreferences(wp);
      const result = await gradleRun(
        'clean',
        wp.uri.fsPath,
        wp,
        'Gradle Command',
        externalApi.getExecuteAPI(),
        prefs
      );
      if (result !== 0) {
        vscode.window.showInformationMessage(
          i18n('message', 'Command ({0}) returned code: {1}', 'clean', result)
        );
      }
    })
  );
}
