'use strict';

import * as vscode from 'vscode';
import { IExternalAPI, } from './shared/externalapi';
import * as path from 'path';
import { ToolAPI } from './toolapi';
import { DeployDebugAPI } from './deploydebugapi';
import { PreferencesAPI } from './preferencesapi';
import { ExampleTemplateAPI } from './exampletemplateapi';
import { CommandAPI } from './commandapi';
import { activateCpp } from './cpp/cpp';
import { activateJava } from './java/java';
import { Help } from './help';
import { BuildTestAPI } from './buildtestapi';
import { createVsCommands } from './vscommands';

class ExternalAPI extends IExternalAPI {
  private toolApi: ToolAPI;
  private debugDeployApi: DeployDebugAPI;
  private buildTestApi: BuildTestAPI;
  private preferencesApi: PreferencesAPI;
  private exampleTemplateApi: ExampleTemplateAPI;
  private commandApi: CommandAPI;
  constructor(resourcesLocation: string) {
    super();
    this.toolApi = new ToolAPI();
    this.preferencesApi = new PreferencesAPI();
    this.debugDeployApi = new DeployDebugAPI(resourcesLocation, this.preferencesApi);
    this.buildTestApi = new BuildTestAPI(this.preferencesApi);
    this.exampleTemplateApi = new ExampleTemplateAPI();
    this.commandApi = new CommandAPI(this.preferencesApi);
  }

  public getToolAPI(): ToolAPI {
    return this.toolApi;
  }
  public getExampleTemplateAPI(): ExampleTemplateAPI {
    return this.exampleTemplateApi;
  }
  public getDeployDebugAPI(): DeployDebugAPI {
    return this.debugDeployApi;
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
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Resources folder will be used for RioLog
  const extensionResourceLocation = path.join(context.extensionPath, 'resources');

  const externalApi = new ExternalAPI(extensionResourceLocation);

  activateCpp(context, externalApi);
  activateJava(context, externalApi);

  createVsCommands(context, externalApi);

  const help = new Help(extensionResourceLocation, externalApi.getPreferencesAPI());
  context.subscriptions.push(help);

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-wpilib" is now active!');

  return externalApi;
}

// this method is called when your extension is deactivated
export function deactivate() {
}
