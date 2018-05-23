'use scrict';
import * as vscode from 'vscode';
import { PreferencesAPI } from './preferencesapi';
import { RioLogWindow } from './riolog/shared/riologwindow';
import { LiveRioConsoleProvider, RioLogWebviewProvider } from './riolog/vscodeimpl';
import { ICodeDeployer, IDeployDebugAPI } from './shared/externalapi';

interface ICodeDeployerQuickPick extends vscode.QuickPickItem {
  deployer: ICodeDeployer;
}

class WPILibDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;
  private debugDeployAPI: DeployDebugAPI;

  constructor(preferences: PreferencesAPI, ddApi: DeployDebugAPI) {
    this.preferences = preferences;
    this.debugDeployAPI = ddApi;
    const regProv = vscode.debug.registerDebugConfigurationProvider('wpilib', this);
    this.disposables.push(regProv);
  }

  public resolveDebugConfiguration(_: vscode.WorkspaceFolder | undefined,
                                   config: vscode.DebugConfiguration, __?: vscode.CancellationToken):
    vscode.ProviderResult<vscode.DebugConfiguration> {
    let desktop = false;
    if ('desktop' in config) {
      desktop = config.desktop as boolean;
    } else {
      console.log('debugger has no desktop argument. Assuming roboRIO');
    }
    return new Promise<undefined>(async (resolve) => {
      const workspace = await this.preferences.getFirstOrSelectedWorkspace();
      if (workspace === undefined) {
        return;
      }
      await this.debugDeployAPI.debugCode(workspace, desktop);
      resolve();
    });
  }

  public provideDebugConfigurations(_folder: vscode.WorkspaceFolder | undefined,
                                    __?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    const configurationDeploy: vscode.DebugConfiguration = {
      desktop: false,
      name: 'WPILib roboRIO Debug',
      request: 'launch',
      type: 'wpilib',
    };
    const configurationDebug: vscode.DebugConfiguration = {
      desktop: true,
      name: 'WPILib Desktop Debug',
      request: 'launch',
      type: 'wpilib',
    };
    return [configurationDeploy, configurationDebug];
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

export class DeployDebugAPI extends IDeployDebugAPI {
  private languageChoices: string[] = [];
  private deployers: ICodeDeployerQuickPick[] = [];
  private debuggers: ICodeDeployerQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;
  private debugConfigurationProvider: WPILibDebugConfigurationProvider;

  private rioLogWebViewProvider: RioLogWebviewProvider;
  private rioLogConsoleProvider: LiveRioConsoleProvider;
  private liveWindow: RioLogWindow;

  constructor(resourcesFolder: string, preferences: PreferencesAPI) {
    super();
    this.preferences = preferences;

    this.rioLogWebViewProvider = new RioLogWebviewProvider(resourcesFolder);
    this.rioLogConsoleProvider = new LiveRioConsoleProvider();
    this.liveWindow = new RioLogWindow(this.rioLogWebViewProvider, this.rioLogConsoleProvider);
    this.disposables.push(this.liveWindow);

    this.debugConfigurationProvider = new WPILibDebugConfigurationProvider(this.preferences, this);
    this.disposables.push(this.debugConfigurationProvider);
  }

  public async startRioLog(teamNumber: number, _: boolean): Promise<boolean> {
    this.liveWindow.start(teamNumber);
    return true;
  }
  public registerCodeDeploy(deployer: ICodeDeployer): void {
    const qpi: ICodeDeployerQuickPick = {
      deployer,
      description: deployer.getDescription(),
      label: deployer.getDisplayName(),

    };
    this.deployers.push(qpi);
  }

  public registerCodeDebug(deployer: ICodeDeployer): void {
    const qpi: ICodeDeployerQuickPick = {
      deployer,
      description: deployer.getDescription(),
      label: deployer.getDisplayName(),
    };
    this.debuggers.push(qpi);
  }
  public addLanguageChoice(language: string): void {
    this.languageChoices.push(language);
  }

  public debugCode(workspace: vscode.WorkspaceFolder, _desktop: boolean): Promise<boolean> {
    return this.deployCommon(workspace, this.debuggers, true);
  }
  public deployCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    return this.deployCommon(workspace, this.deployers, false);
  }

  public getLanguageChoices(): string[] {
    return this.languageChoices;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async deployCommon(workspace: vscode.WorkspaceFolder, deployer: ICodeDeployerQuickPick[],
                             debug: boolean): Promise<boolean> {
    if (deployer.length <= 0) {
      vscode.window.showInformationMessage('No registered deployers');
      return false;
    }

    const preferences = this.preferences.getPreferences(workspace);

    const validDeployers: ICodeDeployerQuickPick[] = [];
    for (const d of deployer) {
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
      const selection = await vscode.window.showQuickPick(validDeployers, { placeHolder: 'Pick a language' });
      if (selection === undefined) {
        await vscode.window.showInformationMessage('Selection exited. Cancelling');
        return false;
      }
      langSelection = selection;
    }

    if (preferences.getAutoSaveOnDeploy()) {
      await vscode.workspace.saveAll();
    }
    const teamNumber = await preferences.getTeamNumber();
    try {
      const deploySuccess = await langSelection.deployer.runDeployer(teamNumber, workspace);
      if (preferences.getAutoStartRioLog() && deploySuccess) {
        await this.startRioLog(teamNumber, !debug);
      }
      return true;
    } catch (err) {
      await vscode.window.showErrorMessage('Unknown error occured. See output window or console log for more information.');
      console.log(err);
      return false;
    }
  }
}
