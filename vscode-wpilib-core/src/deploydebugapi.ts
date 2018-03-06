'use scrict';
import * as vscode from 'vscode';
import { IDeployDebugAPI, ICodeDeployer } from './shared/externalapi';
import { RioLog } from './riolog';
import * as path from 'path';
import { PreferencesAPI } from './preferencesapi';

interface ICodeDeployerQuickPick extends vscode.QuickPickItem {
  deployer: ICodeDeployer;
}

export class DeployDebugAPI extends IDeployDebugAPI {
  public languageChoices: string[] = [];
  private deployers: ICodeDeployerQuickPick[] = [];
  private debuggers: ICodeDeployerQuickPick[] = [];
  private riolog: RioLog;
  private resourcesFolder: string;
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;

  constructor(resourcesFolder: string, preferences: PreferencesAPI) {
    super();
    this.resourcesFolder = resourcesFolder;
    this.riolog = new RioLog();
    this.disposables.push(this.riolog);
    this.preferences = preferences;
  }

  startRioLog(teamNumber: number, show: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      this.riolog.connect(teamNumber, path.join(this.resourcesFolder, 'riolog'), show);
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
