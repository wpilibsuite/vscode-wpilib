'use scrict';
import * as vscode from 'vscode';
import { IDeployDebugAPI, ICodeDeployer } from './shared/externalapi';
import { PreferencesAPI } from './preferencesapi';
import { RioLogWebviewProvider, LiveRioConsoleProvider } from './riolog/vscodeimpl';
import { RioLogWindow } from './riolog/shared/riologwindow';

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
      desktop = config.desktop;
    } else {
      console.log('debugger has no desktop argument. Assuming roboRIO');
    }
    return new Promise<undefined>(async (resolve) => {
      const workspace = await this.preferences.getFirstOrSelectedWorkspace();
      if (workspace === undefined) {
        return;
      }
      await this.debugDeployAPI.debugCode(workspace, desktop, this.preferences.getPreferences(workspace).getOnline());
      resolve();
    });
  }

  public provideDebugConfigurations(_folder: vscode.WorkspaceFolder | undefined,
    __?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    const configurationDeploy: vscode.DebugConfiguration = {
      type: 'wpilib',
      name: 'WPILib roboRIO Debug',
      request: 'launch',
      desktop: false
    };
    const configurationDebug: vscode.DebugConfiguration = {
      type: 'wpilib',
      name: 'WPILib Desktop Debug',
      request: 'launch',
      desktop: true
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
      deployer: deployer,
      label: deployer.getDisplayName(),
      description: deployer.getDescription()
    };
    this.deployers.push(qpi);
  }

  public registerCodeDebug(deployer: ICodeDeployer): void {
    const qpi: ICodeDeployerQuickPick = {
      deployer: deployer,
      label: deployer.getDisplayName(),
      description: deployer.getDescription()
    };
    this.debuggers.push(qpi);
  }
  public addLanguageChoice(language: string): void {
    this.languageChoices.push(language);
  }

  public debugCode(workspace: vscode.WorkspaceFolder, _desktop: boolean, online: boolean): Promise<boolean> {
    return this.deployCommon(workspace, this.debuggers, true, online);
  }
  public deployCode(workspace: vscode.WorkspaceFolder, online: boolean): Promise<boolean> {
    return this.deployCommon(workspace, this.deployers, false, online);
  }

  private async deployCommon(workspace: vscode.WorkspaceFolder, deployer: ICodeDeployerQuickPick[], debug: boolean, online: boolean): Promise<boolean> {
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
      const deploySuccess = await langSelection.deployer.runDeployer(teamNumber, workspace, online);
      if (preferences.getAutoStartRioLog() && deploySuccess) {
        await this.startRioLog(teamNumber, !debug);
      }
      return true;
    }
    catch (err) {
      await vscode.window.showErrorMessage('Unknown error occured. See output window or console log for more information.');
      console.log(err);
      return false;
    }
  }

  public getLanguageChoices(): string[] {
    return this.languageChoices;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
