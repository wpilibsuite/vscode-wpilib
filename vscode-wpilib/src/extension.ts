'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { BuildTestAPI } from './buildtestapi';
import { CommandAPI } from './commandapi';
import { activateCpp } from './cpp/cpp';
import { DeployDebugAPI } from './deploydebugapi';
import { ExampleTemplateAPI } from './exampletemplateapi';
import { ExecuteAPI } from './executor';
import { activateJava } from './java/java';
import { PersistentFolderState } from './persistentState';
import { PreferencesAPI } from './preferencesapi';
import { IExternalAPI } from './shared/externalapi';
import { ToolAPI } from './toolapi';
import { setExtensionContext } from './utilities';
import { createVsCommands } from './vscommands';
import { EclipseUpgrade } from './webviews/eclipseupgrade';
import { Help } from './webviews/help';
import { ProjectCreator } from './webviews/projectcreator';

class ExternalAPI extends IExternalAPI {
  public static async Create(resourceFolder: string): Promise<ExternalAPI> {
    const preferencesApi = await PreferencesAPI.Create();
    const deployDebugApi = await DeployDebugAPI.Create(resourceFolder, preferencesApi);
    const buildTestApi = new BuildTestAPI(preferencesApi);
    const externalApi = new ExternalAPI(preferencesApi, deployDebugApi, buildTestApi);
    return externalApi;
  }

  private readonly toolApi: ToolAPI;
  private readonly deployDebugApi: DeployDebugAPI;
  private readonly buildTestApi: BuildTestAPI;
  private readonly preferencesApi: PreferencesAPI;
  private readonly exampleTemplateApi: ExampleTemplateAPI;
  private readonly commandApi: CommandAPI;
  private readonly executeApi: ExecuteAPI;

  private constructor(preferencesApi: PreferencesAPI, deployDebugApi: DeployDebugAPI, buildTestApi: BuildTestAPI) {
    super();
    this.toolApi = new ToolAPI();
    this.exampleTemplateApi = new ExampleTemplateAPI();
    this.commandApi = new CommandAPI();
    this.executeApi = new ExecuteAPI();
    this.preferencesApi = preferencesApi;
    this.deployDebugApi = deployDebugApi;
    this.buildTestApi = buildTestApi;
  }

  public getToolAPI(): ToolAPI {
    return this.toolApi;
  }
  public getExampleTemplateAPI(): ExampleTemplateAPI {
    return this.exampleTemplateApi;
  }
  public getDeployDebugAPI(): DeployDebugAPI {
    return this.deployDebugApi;
  }
  public getPreferencesAPI(): PreferencesAPI {
    return this.preferencesApi;
  }
  public getCommandAPI(): CommandAPI {
    return this.commandApi;
  }
  public getBuildTestAPI(): BuildTestAPI {
    return this.buildTestApi;
  }
  public getExecuteAPI(): ExecuteAPI {
    return this.executeApi;
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  setExtensionContext(context);

  // Resources folder will be used for RioLog
  const extensionResourceLocation = path.join(context.extensionPath, 'resources');

  const externalApi = await ExternalAPI.Create(extensionResourceLocation);

  await activateCpp(context, externalApi);
  await activateJava(context, externalApi);

  createVsCommands(context, externalApi);

  const help = await Help.Create(externalApi.getPreferencesAPI());
  const eclipseupgrade = await EclipseUpgrade.Create();

  context.subscriptions.push(help);

  context.subscriptions.push(eclipseupgrade);

  context.subscriptions.push(await ProjectCreator.Create(externalApi.getExampleTemplateAPI()));

  const wp = vscode.workspace.workspaceFolders;
  if (wp) {
    for (const w of wp) {
      if (externalApi.getPreferencesAPI().getPreferences(w).getIsWPILibProject()) {
        const persistentState = new PersistentFolderState('wpilib.newProjectHelp', false, w.uri.fsPath);
        if (persistentState.Value === false) {
          persistentState.Value = true;
          help.displayHelp();
          break;
        }
      }
    }
  }

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-wpilib" is now active!');

  return externalApi;
}

// this method is called when your extension is deactivated
export function deactivate() {
  //
}
