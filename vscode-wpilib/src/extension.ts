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
    const externalApi = new ExternalAPI();
    externalApi.preferencesApi = await PreferencesAPI.Create();
    externalApi.deployDebugApi = await DeployDebugAPI.Create(resourceFolder, externalApi.preferencesApi);
    externalApi.buildTestApi = new BuildTestAPI(externalApi.preferencesApi);
    return externalApi;
  }

  private toolApi: ToolAPI;
  private deployDebugApi: DeployDebugAPI | undefined;
  private buildTestApi: BuildTestAPI | undefined;
  private preferencesApi: PreferencesAPI | undefined;
  private exampleTemplateApi: ExampleTemplateAPI;
  private commandApi: CommandAPI;
  private executeApi: ExecuteAPI;

  private constructor() {
    super();
    this.toolApi = new ToolAPI();
    this.exampleTemplateApi = new ExampleTemplateAPI();
    this.commandApi = new CommandAPI();
    this.executeApi = new ExecuteAPI();
  }

  public getToolAPI(): ToolAPI {
    return this.toolApi;
  }
  public getExampleTemplateAPI(): ExampleTemplateAPI {
    return this.exampleTemplateApi;
  }
  public getDeployDebugAPI(): DeployDebugAPI {
    // tslint:disable-next-line:no-non-null-assertion
    return this.deployDebugApi!;
  }
  public getPreferencesAPI(): PreferencesAPI {
    // tslint:disable-next-line:no-non-null-assertion
    return this.preferencesApi!;
  }
  public getCommandAPI(): CommandAPI {
    return this.commandApi;
  }
  public getBuildTestAPI(): BuildTestAPI {
    // tslint:disable-next-line:no-non-null-assertion
    return this.buildTestApi!;
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
// tslint:disable-next-line:no-empty
export function deactivate() {
}
