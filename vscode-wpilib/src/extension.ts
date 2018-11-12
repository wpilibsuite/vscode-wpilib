'use strict';

// These must be in the files to translate
// This cannot be placed in a library.
import * as nls from 'vscode-nls';
const config = JSON.parse(process.env.VSCODE_NLS_CONFIG as string);
const localize = nls.config(config as nls.Options)();

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { BuildTestAPI } from './buildtestapi';
import { BuiltinTools } from './builtintools';
import { CommandAPI } from './commandapi';
import { activateCpp } from './cpp/cpp';
import { DeployDebugAPI } from './deploydebugapi';
import { ExampleTemplateAPI } from './exampletemplateapi';
import { ExecuteAPI } from './executor';
import { activateJava } from './java/java';
import { findJdkPath } from './jdkdetector';
import { closeLogger, logger, setLoggerDirectory } from './logger';
import { PersistentFolderState } from './persistentState';
import { PreferencesAPI } from './preferencesapi';
import { promisifyMkdirp } from './shared/generator';
import { ToolAPI } from './toolapi';
import { setExtensionContext, setJavaHome } from './utilities';
import { UtilitiesAPI } from './utilitiesapi';
import { fireVendorDepsChanged, VendorLibraries } from './vendorlibraries';
import { createVsCommands } from './vscommands';
import { AlphaError } from './webviews/alphaerror';
import { EclipseImport } from './webviews/eclipseimport';
import { Help } from './webviews/help';
import { ProjectCreator } from './webviews/projectcreator';
import { WPILibUpdates } from './wpilibupdates';

// External API class to implement the IExternalAPI interface
class ExternalAPI implements IExternalAPI {
  // Create method is used because constructors cannot be async.
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
  private readonly utilitiesApi: UtilitiesAPI;

  private constructor(preferencesApi: PreferencesAPI, deployDebugApi: DeployDebugAPI, buildTestApi: BuildTestAPI) {
    this.exampleTemplateApi = new ExampleTemplateAPI();
    this.commandApi = new CommandAPI();
    this.executeApi = new ExecuteAPI();
    this.preferencesApi = preferencesApi;
    this.deployDebugApi = deployDebugApi;
    this.buildTestApi = buildTestApi;
    this.utilitiesApi = new UtilitiesAPI();
    this.toolApi = new ToolAPI(this);
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
  public getUtilitiesAPI(): UtilitiesAPI {
    return this.utilitiesApi;
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  setExtensionContext(context);

  // Resources folder is used for gradle template along with HTML files
  const extensionResourceLocation = path.join(context.extensionPath, 'resources');

  if (vscode.extensions.getExtension('wpifirst.vscode-wpilib') !== undefined) {
    const alphaError = await AlphaError.Create(extensionResourceLocation);
    alphaError.displayPage();
    context.subscriptions.push(alphaError);
    return;
  }

  // The external API can be used by other extensions that want to use our
  // functionality. Its definition is provided in shared/externalapi.ts.
  // That file can be copied to another project.
  const externalApi = await ExternalAPI.Create(extensionResourceLocation);

  const frcHomeDir = externalApi.getUtilitiesAPI().getWPILibHomeDir();

  const logPath = path.join(frcHomeDir, 'logs');
  try {
    await promisifyMkdirp(logPath);
    setLoggerDirectory(logPath);
  } catch (err) {
    logger.error('Error creating logger', err);
  }

  const jdkLoc = await findJdkPath(externalApi);

  if (jdkLoc !== undefined) {
    setJavaHome(jdkLoc);
  } else {
    await vscode.window.showErrorMessage(localize('extension.noJava',
                                                  'Java 11 required, but not found. Might have compilation errors'));
  }

  // Activate the C++ parts of the extension
  await activateCpp(context, externalApi);
  // Active the java parts of the extension
  await activateJava(context, externalApi);

  // Create all of our commands that the extension runs
  createVsCommands(context, externalApi);

  // Create the help window provider
  const help = await Help.Create(externalApi.getPreferencesAPI(), extensionResourceLocation);

  // Create the eclipse import provider
  const eclipseimport = await EclipseImport.Create(extensionResourceLocation);

  // Create the new project creator provider
  const projectcreator = await ProjectCreator.Create(externalApi.getExampleTemplateAPI(), extensionResourceLocation);

  // Anything pushed into context.subscriptions will get disposed when VS Code closes.
  context.subscriptions.push(help);

  context.subscriptions.push(eclipseimport);

  context.subscriptions.push(projectcreator);

  // Add built in tools
  context.subscriptions.push(await BuiltinTools.Create(externalApi));

  const vendorLibs = new VendorLibraries(externalApi);

  context.subscriptions.push(vendorLibs);

  const wpilibUpdate = new WPILibUpdates(externalApi);

  context.subscriptions.push(wpilibUpdate);

  // Detect if we are a new WPILib project, and if so display the WPILib help window.
  // Also check for local GradleRIO update
  const wp = vscode.workspace.workspaceFolders;
  if (wp) {
    for (const w of wp) {
      const prefs = externalApi.getPreferencesAPI().getPreferences(w);
      if (prefs.getIsWPILibProject()) {
        const vendorDepsPattern = new vscode.RelativePattern(path.join(w.uri.fsPath, 'vendordeps'), '**/*.json');
        const vendorDepsWatcher = vscode.workspace.createFileSystemWatcher(vendorDepsPattern);
        context.subscriptions.push(vendorDepsWatcher);
        const localW = w;

        const fireEvent = () => {
          fireVendorDepsChanged(localW);
        };

        vendorDepsWatcher.onDidChange(fireEvent, null, context.subscriptions);

        vendorDepsWatcher.onDidCreate(fireEvent, null, context.subscriptions);

        vendorDepsWatcher.onDidDelete(fireEvent, null, context.subscriptions);

        if (prefs.getProjectYear() !== 'Beta2019') {
          await vscode.window
                      .showInformationMessage('This project is not compatible with this version of the extension. Please create a new project.');
          continue;
        }
        await wpilibUpdate.checkForInitialUpdate(w);
        const persistentState = new PersistentFolderState('wpilib.newProjectHelp', false, w.uri.fsPath);
        if (persistentState.Value === false) {
          persistentState.Value = true;
          help.displayHelp();
          break;
        }
      }
    }
  }

  // Log our extension is active
  logger.log('Congratulations, your extension "vscode-wpilib" is now active!');

  return externalApi;
}

// this method is called when your extension is deactivated
export function deactivate() {
  closeLogger();
}
