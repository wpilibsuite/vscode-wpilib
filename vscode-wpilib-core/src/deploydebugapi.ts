'use scrict';
import * as vscode from 'vscode';
import { IDeployDebugAPI, ICodeDeployer } from './shared/externalapi';
import { RioLog } from './riolog';
import { PreferencesAPI } from './preferencesapi';
import { RioLogWebviewProvider, LiveRioConsoleProvider, RioLogViewerWebviewProvider, ViewerRioConsoleProvider } from './riolog/vscodeimpl';
import { RioLogWindow } from './riolog/riologwindow';

interface ICodeDeployerQuickPick extends vscode.QuickPickItem {
  deployer: ICodeDeployer;
}

export class DeployDebugAPI extends IDeployDebugAPI {
  public languageChoices: string[] = [];
  private deployers: ICodeDeployerQuickPick[] = [];
  private debuggers: ICodeDeployerQuickPick[] = [];
  private riolog: RioLog;
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;
  private rioLogWebViewProvider: RioLogWebviewProvider;
  private rioLogConsoleProvider: LiveRioConsoleProvider;
  private rioLogViewerWebViewProvider: RioLogViewerWebviewProvider;
  private rioLogViewerProvider: ViewerRioConsoleProvider;
  private liveWindow: RioLogWindow;


  constructor(resourcesFolder: string, preferences: PreferencesAPI) {
    super();
    this.riolog = new RioLog();
    this.disposables.push(this.riolog);
    this.preferences = preferences;
    this.rioLogWebViewProvider = new RioLogWebviewProvider(resourcesFolder);
    this.rioLogConsoleProvider = new LiveRioConsoleProvider();
    this.liveWindow = new RioLogWindow(this.rioLogWebViewProvider, this.rioLogConsoleProvider);
    this.rioLogViewerWebViewProvider = new RioLogViewerWebviewProvider(resourcesFolder);
    this.rioLogViewerProvider = new ViewerRioConsoleProvider;
    this.disposables.push(this.liveWindow);
  }

  async startRioLogViewer(): Promise<boolean> {
    this.disposables.push(new RioLogWindow(this.rioLogViewerWebViewProvider, this.rioLogViewerProvider));
    return true;
  }

  startRioLog(teamNumber: number, _: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      this.liveWindow.start(teamNumber);
      resolve(true);
    });
  }
  registerCodeDeploy(deployer: ICodeDeployer): void {
    let qpi: ICodeDeployerQuickPick = {
      deployer: deployer,
      label: deployer.getDisplayName(),
      description: deployer.getDescription()
    };
    this.deployers.push(qpi);
  }

  registerCodeDebug(deployer: ICodeDeployer): void {
    let qpi: ICodeDeployerQuickPick = {
      deployer: deployer,
      label: deployer.getDisplayName(),
      description: deployer.getDescription()
    };
    this.debuggers.push(qpi);
  }
  addLanguageChoice(language: string): void {
    this.languageChoices.push(language);
  }

  debugCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    return this.deployCommon(workspace, this.debuggers, true);
  }
  async deployCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    return this.deployCommon(workspace, this.deployers, false);
  }

  private async deployCommon(workspace: vscode.WorkspaceFolder, deployer: ICodeDeployerQuickPick[], debug: boolean): Promise<boolean> {
    if (deployer.length <= 0) {
      vscode.window.showInformationMessage('No registered deployers');
      return false;
    }

    let preferences = this.preferences.getPreferences(workspace);

    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return false;
    }

    let validDeployers: ICodeDeployerQuickPick[] = [];
    for (let d of deployer) {
      if (await d.deployer.getIsCurrentlyValid(workspace)) {
        validDeployers.push(d);
      }
    }

    let langSelection: ICodeDeployerQuickPick;

    if (validDeployers.length <= 0) {
      vscode.window.showInformationMessage('No available deployers');
      return false;
    } else if (validDeployers.length === 1) {
      langSelection = validDeployers[0];
    } else {
      let selection = await vscode.window.showQuickPick(validDeployers, { placeHolder: 'Pick a language'});
      if (selection === undefined) {
        await vscode.window.showInformationMessage('Selection exited. Cancelling');
        return false;
      }
      langSelection = selection;
    }

    if (preferences.getAutoSaveOnDeploy()) {
      await vscode.workspace.saveAll();
    }
    let teamNumber = await preferences.getTeamNumber();
    let deploySuccess = await langSelection.deployer.runDeployer(teamNumber, workspace);
    if (preferences.getAutoStartRioLog() && deploySuccess) {
      await this.startRioLog(teamNumber, !debug);
    }
    return true;
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
