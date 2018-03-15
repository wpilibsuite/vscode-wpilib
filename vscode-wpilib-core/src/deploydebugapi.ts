'use scrict';
import * as vscode from 'vscode';
import { IDeployDebugAPI, ICodeDeployer } from './shared/externalapi';
import { PreferencesAPI } from './preferencesapi';
//import { RioLogWebviewProvider, LiveRioConsoleProvider, RioLogViewerWebviewProvider, ViewerRioConsoleProvider } from './riolog/vscodeimpl';
//import { RioLogWindow } from './riolog/riologwindow';

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
    let debug = false;
    if ('debug' in config) {
      debug = config.debug;
    } else {
      console.log('debugger has no debug argument. Assuming deploy');
    }
    return new Promise<undefined>(async (resolve) => {
      const workspace = await this.preferences.getFirstOrSelectedWorkspace();
      if (workspace === undefined) {
        return;
      }
      if (debug) {
        await this.debugDeployAPI.debugCode(workspace);
      } else {
        await this.debugDeployAPI.deployCode(workspace);
      }
      resolve();
    });
  }

  public provideDebugConfigurations(_folder: vscode.WorkspaceFolder | undefined,
    __?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    const configurationDeploy: vscode.DebugConfiguration = {
      type: 'wpilib',
      name: 'WPILib Deploy',
      request: 'launch',
      debug: false
    };
    const configurationDebug: vscode.DebugConfiguration = {
      type: 'wpilib',
      name: 'WPILib Debug',
      request: 'launch',
      debug: true
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
  public languageChoices: string[] = [];
  private deployers: ICodeDeployerQuickPick[] = [];
  private debuggers: ICodeDeployerQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;
  private debugConfigurationProvider: WPILibDebugConfigurationProvider;

  /*
  private rioLogWebViewProvider: RioLogWebviewProvider;
  private rioLogConsoleProvider: LiveRioConsoleProvider;
  private rioLogViewerWebViewProvider: RioLogViewerWebviewProvider;
  private rioLogViewerProvider: ViewerRioConsoleProvider;
  private liveWindow: RioLogWindow;
  */


  constructor(_/*resourcesFolder*/: string, preferences: PreferencesAPI) {
    super();
    this.preferences = preferences;
    /*
    this.rioLogWebViewProvider = new RioLogWebviewProvider(resourcesFolder);
    this.rioLogConsoleProvider = new LiveRioConsoleProvider();
    this.liveWindow = new RioLogWindow(this.rioLogWebViewProvider, this.rioLogConsoleProvider);
    this.rioLogViewerWebViewProvider = new RioLogViewerWebviewProvider(resourcesFolder);
    this.rioLogViewerProvider = new ViewerRioConsoleProvider;
    this.disposables.push(this.liveWindow);
    */
    this.debugConfigurationProvider = new WPILibDebugConfigurationProvider(this.preferences, this);
    this.disposables.push(this.debugConfigurationProvider);
  }

  public async startRioLogViewer(): Promise<boolean> {
    console.log('riolog requires insider');
    //this.disposables.push(new RioLogWindow(this.rioLogViewerWebViewProvider, this.rioLogViewerProvider));
    return true;
  }

  public async startRioLog(__/*teamNumber*/: number, _: boolean): Promise<boolean> {
    console.log('riolog requires insider');
    //this.liveWindow.start(teamNumber);
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

  public debugCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    return this.deployCommon(workspace, this.debuggers, true);
  }
  public async deployCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    return this.deployCommon(workspace, this.deployers, false);
  }

  private async deployCommon(workspace: vscode.WorkspaceFolder, deployer: ICodeDeployerQuickPick[], debug: boolean): Promise<boolean> {
    if (deployer.length <= 0) {
      vscode.window.showInformationMessage('No registered deployers');
      return false;
    }

    const preferences = this.preferences.getPreferences(workspace);

    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return false;
    }

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
    const deploySuccess = await langSelection.deployer.runDeployer(teamNumber, workspace);
    if (preferences.getAutoStartRioLog() && deploySuccess) {
      await this.startRioLog(teamNumber, !debug);
    }
    return true;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
