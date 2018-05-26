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
  private deployDebugAPI: IDeployDebugAPI;

  constructor(ddApi: IDeployDebugAPI) {
    this.deployDebugAPI = ddApi;
    const regProv = vscode.debug.registerDebugConfigurationProvider('wpilib', this);
    this.disposables.push(regProv);
  }

  public resolveDebugConfiguration(workspace: vscode.WorkspaceFolder | undefined,
                                   config: vscode.DebugConfiguration, __?: vscode.CancellationToken):
    vscode.ProviderResult<vscode.DebugConfiguration> {
    if (workspace === undefined) {
      return config;
    }
    let desktop = false;
    if ('desktop' in config) {
      desktop = config.desktop as boolean;
    } else {
      console.log('debugger has no desktop argument. Assuming roboRIO');
    }
    return new Promise<undefined>(async (resolve) => {
      if (desktop) {
        await this.deployDebugAPI.simulateCode(workspace, undefined);
      } else {
        await this.deployDebugAPI.debugCode(workspace, undefined);
      }
      resolve();
    });
  }

  public provideDebugConfigurations(_workspace: vscode.WorkspaceFolder | undefined,
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
  public static async Create(resourceFolder: string, preferences: PreferencesAPI): Promise<DeployDebugAPI> {
    const dda = new DeployDebugAPI(preferences);
    dda.rioLogWebViewProvider = await RioLogWebviewProvider.Create(resourceFolder);
    dda.liveWindow = new RioLogWindow(dda.rioLogWebViewProvider, dda.rioLogConsoleProvider);
    dda.disposables.push(dda.liveWindow);
    return dda;
  }
  private languageChoices: string[] = [];
  private deployers: ICodeDeployerQuickPick[] = [];
  private debuggers: ICodeDeployerQuickPick[] = [];
  private simulators: ICodeDeployerQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;
  private debugConfigurationProvider: WPILibDebugConfigurationProvider;

  private rioLogWebViewProvider: RioLogWebviewProvider | undefined;
  private rioLogConsoleProvider: LiveRioConsoleProvider;
  private liveWindow: RioLogWindow | undefined;

  private constructor(preferences: PreferencesAPI) {
    super();
    this.preferences = preferences;

    this.rioLogConsoleProvider = new LiveRioConsoleProvider();

    this.debugConfigurationProvider = new WPILibDebugConfigurationProvider(this);
    this.disposables.push(this.debugConfigurationProvider);
  }

  public async startRioLog(teamNumber: number, _: boolean): Promise<boolean> {
    // tslint:disable-next-line:no-non-null-assertion
    this.liveWindow!.start(teamNumber);
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

  public registerCodeSimulate(deployer: ICodeDeployer): void {
    const qpi: ICodeDeployerQuickPick = {
      deployer,
      description: deployer.getDescription(),
      label: deployer.getDisplayName(),
    };
    this.simulators.push(qpi);
  }

  public addLanguageChoice(language: string): void {
    this.languageChoices.push(language);
  }

  public debugCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean> {
    return this.deployCommon(workspace, this.debuggers, true, false, source);
  }

  public deployCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean> {
    return this.deployCommon(workspace, this.deployers, false, false, source);
  }

  public simulateCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean> {
    return this.deployCommon(workspace, this.simulators, true, true, source);
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
                             debug: boolean, desktop: boolean, source: vscode.Uri | undefined): Promise<boolean> {
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
      const deploySuccess = await langSelection.deployer.runDeployer(teamNumber, workspace, source);
      if (preferences.getAutoStartRioLog() && deploySuccess && !desktop) {
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
