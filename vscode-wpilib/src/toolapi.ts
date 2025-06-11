'use scrict';
import * as vscode from 'vscode';
import { IExternalAPI, IToolAPI, IToolRunner } from 'vscode-wpilibapi';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { gradleRun } from './utilities';

interface IToolQuickPick extends vscode.QuickPickItem {
  runner: IToolRunner;
}

// The tools API provider. Lists tools added to it in a quick pick to select.
export class ToolAPI implements IToolAPI {
  public static async InstallToolsFromGradle(
    workspace: vscode.WorkspaceFolder,
    externalApi: IExternalAPI
  ): Promise<void> {
    const grResult = await gradleRun(
      'InstallAllTools',
      workspace.uri.fsPath,
      workspace,
      'ToolInstall',
      externalApi.getExecuteAPI(),
      externalApi.getPreferencesAPI().getPreferences(workspace)
    );

    if (grResult === 0) {
      const result = await vscode.window.showInformationMessage(
        i18n('message', 'Restart required for new tools. Restart now?'),
        {
          modal: true,
        },
        i18n('ui', 'Yes'),
        i18n('ui', 'No')
      );
      if (result !== undefined && result === i18n('ui', 'Yes')) {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    } else {
      logger.log(grResult.toString());
      vscode.window.showInformationMessage(i18n('message', 'Tool install failed'));
      return;
    }
  }

  private tools: IToolQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];
  private externalApi: IExternalAPI;

  public constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;
  }

  public async startTool(): Promise<boolean> {
    if (this.tools.length <= 0) {
      const grResult = await vscode.window.showInformationMessage(
        i18n('message', 'No tools found. Would you like to use Gradle to grab some?'),
        { modal: true },
        i18n('ui', 'Yes'),
        i18n('ui', 'No')
      );
      if (grResult !== undefined && grResult === i18n('ui', 'Yes')) {
        const preferencesApi = this.externalApi.getPreferencesAPI();
        const workspace = await preferencesApi.getFirstOrSelectedWorkspace();
        if (workspace === undefined) {
          vscode.window.showInformationMessage(
            i18n('message', 'Cannot install gradle tools with an empty workspace')
          );
          return false;
        }
        await ToolAPI.InstallToolsFromGradle(workspace, this.externalApi);
      }
      return false;
    }

    const result = await vscode.window.showQuickPick(this.tools, {
      placeHolder: i18n('ui', 'Pick a tool'),
    });

    if (result === undefined) {
      vscode.window.showInformationMessage(i18n('message', 'Tool run canceled'));
      return false;
    }

    const ret = await result.runner.runTool();
    if (!ret) {
      vscode.window.showInformationMessage(
        `${i18n('message', 'Failed to start tool')}: ${result.runner.getDisplayName()}`
      );
    }
    return ret;
  }
  public addTool(tool: IToolRunner): void {
    const qpi: IToolQuickPick = {
      description: tool.getDescription(),
      label: tool.getDisplayName(),
      runner: tool,
    };
    this.tools.push(qpi);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
