'use strict';

import * as jsonc from 'jsonc-parser';
import * as mm from 'micromatch';
import * as path from 'path';
import * as vscode from 'vscode';
import { CppToolsApi, CustomConfigurationProvider, SourceFileConfigurationItem, WorkspaceBrowseConfiguration } from 'vscode-cpptools';
import { IExecuteAPI, IExternalAPI, IPreferences } from 'vscode-wpilibapi';
import { logger } from '../logger';
import { PersistentFolderState } from '../persistentState';
import { gradleRun, readFileAsync } from '../utilities';
import { onVendorDepsChanged } from '../vendorlibraries';
import { HeaderExplorer } from './headertreeprovider';
import { ISource, IToolChain } from './jsonformats';

const isWindows = (process.platform === 'win32');

function hasDriveLetter(pth: string): boolean {
  return isWindows && pth[1] === ':';
}

function getToolchainName(toolchain: IToolChain): string {
  return `${toolchain.name} (${toolchain.buildType})`;
}

function normalizeDriveLetter(pth: string): string {
  if (hasDriveLetter(pth)) {
    return pth.charAt(0).toUpperCase() + pth.slice(1);
  }

  return pth;
}

function getVersionFromArg(arg: string):
    'c89' | 'c99' | 'c11' | 'c17' | 'c++98' | 'c++03' | 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23' | undefined {
  const lowerArg = arg.toLowerCase();
  if (lowerArg.startsWith('-std') || lowerArg.startsWith('/std')) {
    if (lowerArg.indexOf('++') > 0) {
      // C++ mode
      if (lowerArg.indexOf('23') >= 0 || lowerArg.indexOf('2b') > 0) {
        return 'c++23';
      } else if (lowerArg.indexOf('latest') >= 0 || lowerArg.indexOf('20') >= 0 || lowerArg.indexOf('2a') > 0) {
        return 'c++20';
      } else if (lowerArg.indexOf('17') >= 0 || lowerArg.indexOf('1z') >= 0) {
        return 'c++17';
      } else if (lowerArg.indexOf('14') >= 0 || lowerArg.indexOf('1y') >= 0) {
        return 'c++14';
      } else if (lowerArg.indexOf('11') >= 0 || lowerArg.indexOf('1x') >= 0) {
        return 'c++11';
      } else if (lowerArg.indexOf('03') >= 0) {
        return 'c++03';
      } else if (lowerArg.indexOf('98') >= 0) {
        return 'c++98';
      } else {
        return 'c++20';
      }
    } else {
      // C mode
      if (lowerArg.indexOf('17') >= 0) {
        return 'c17';
      } else if (lowerArg.indexOf('11') >= 0) {
        return 'c11';
      } else if (lowerArg.indexOf('99') >= 0) {
        return 'c99';
      } else if (lowerArg.indexOf('89') >= 0) {
        return 'c89';
      } else {
        return 'c11';
      }
    }
  }
  return undefined;
}

function matchesIncludesExcludes(source: ISource, file: string): boolean {
  if (source.includes.length === 0) {
    return true;
  }
  const result = mm([file], source.includes, {
    ignore: source.excludes,
  });
  return result.length === 1;
}

export interface IEnabledBuildTypes {
  executables: boolean;
  sharedLibraries: boolean;
  staticLibraries: boolean;
}

export class ApiProvider implements CustomConfigurationProvider {
  public static promptForUpdates: boolean = false;

  // ConfigurationProvider public variables
  public readonly extensionId: string = 'vscode-wpilib';
  public readonly name: string = 'WPILib';

  public readonly workspace: vscode.WorkspaceFolder;
  private disposables: vscode.Disposable[] = [];
  private cppToolsApi: CppToolsApi;
  private registered: boolean = false;
  private preferences: IPreferences;

  private headerTreeProvider: HeaderExplorer;

  private toolchains: IToolChain[] = [];
  private foundFiles: SourceFileConfigurationItem[] = [];
  private selectedName: PersistentFolderState<string>;
  private statusBar: vscode.StatusBarItem;
  private binaryTypeStatusBar: vscode.StatusBarItem;

  private enabledBinaryTypes: PersistentFolderState<IEnabledBuildTypes>;

  private readonly configFile: string = 'vscodeconfig.json';
  private configRelativePattern: vscode.RelativePattern;
  private configWatcher: vscode.FileSystemWatcher;

  private gradleWatcher: vscode.FileSystemWatcher | undefined;

  private executeApi: IExecuteAPI;

  constructor(workspace: vscode.WorkspaceFolder, cppToolsApi: CppToolsApi, externalApi: IExternalAPI, headerTreeProvider: HeaderExplorer) {
    this.preferences = externalApi.getPreferencesAPI().getPreferences(workspace);
    this.workspace = workspace;
    this.cppToolsApi = cppToolsApi;
    this.executeApi = externalApi.getExecuteAPI();
    this.cppToolsApi.registerCustomConfigurationProvider(this);
    this.headerTreeProvider = headerTreeProvider;

    const fsPath = workspace.uri.fsPath;

    this.configRelativePattern = new vscode.RelativePattern(path.join(fsPath, 'build'), this.configFile);
    this.configWatcher = vscode.workspace.createFileSystemWatcher(this.configRelativePattern);
    this.disposables.push(this.configWatcher);
    this.selectedName = new PersistentFolderState<string>('gradleProperties.selectedName', 'none', fsPath);

    this.enabledBinaryTypes = new PersistentFolderState<IEnabledBuildTypes>('gradleProperties.enabledBinaryTypes', {
      executables: true,
      sharedLibraries: true,
      staticLibraries: true,
    }, fsPath);

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 2);
    this.statusBar.text = this.selectedName.Value;
    this.statusBar.tooltip = 'Click to change toolchain';
    this.statusBar.command = 'wpilibcore.selectCppToolchain';

    this.disposables.push(this.statusBar);

    this.binaryTypeStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 3);
    this.binaryTypeStatusBar.text = 'Binary Types';
    this.binaryTypeStatusBar.tooltip = 'Click to change enabled binary types';
    this.binaryTypeStatusBar.command = 'wpilibcore.selectCppBinaryTypes';

    this.disposables.push(this.binaryTypeStatusBar);

    this.disposables.push(this.configWatcher.onDidChange(this.onCreateOrChange, this));
    this.disposables.push(this.configWatcher.onDidCreate(this.onCreateOrChange, this));
    this.disposables.push(this.configWatcher.onDidDelete(this.onDelete, this));

    this.setupWatchers();

    this.loadConfigs().catch();
  }

  public async canProvideBrowseConfigurationsPerFolder(_?: vscode.CancellationToken | undefined): Promise<boolean> {
    return false;
  }
  public async provideFolderBrowseConfiguration(_: vscode.Uri, __?: vscode.CancellationToken | undefined)
    : Promise<WorkspaceBrowseConfiguration> {
    throw new Error('Method not supported.');
  }

  public async canProvideBrowseConfiguration(_?: vscode.CancellationToken | undefined): Promise<boolean> {
    return true;
  }
  public async provideBrowseConfiguration(_?: vscode.CancellationToken | undefined): Promise<WorkspaceBrowseConfiguration> {
    const browsePath: string[] = [];
    let compilerPath;
    for (const tc of this.toolchains) {
      if (getToolchainName(tc) === this.selectedName.Value) {
        // Found our TC
        compilerPath = tc.cppPath;
        browsePath.push(...tc.allLibFiles);
      }
    }
    if (compilerPath === undefined) {
      const config: WorkspaceBrowseConfiguration = {
        browsePath,
      };
      return config;
    } else {
      const config: WorkspaceBrowseConfiguration = {
        browsePath,
        compilerPath,
      };
      return config;
    }
  }

  public async canProvideConfiguration(uri: vscode.Uri, _: vscode.CancellationToken | undefined): Promise<boolean> {
    const fileWp = vscode.workspace.getWorkspaceFolder(uri);
    if (fileWp === undefined || fileWp.index !== this.workspace.index) {
      return false;
    }
    return this.findMatchingBinary(uri);
  }

  public async provideConfigurations(uris: vscode.Uri[], _: vscode.CancellationToken | undefined): Promise<SourceFileConfigurationItem[]> {
    const ret: SourceFileConfigurationItem[] = [];

    for (const uri of uris) {
      const uriPath = uri.toString();
      for (const ff of this.foundFiles) {
        if (ff.uri === uriPath) {
          ret.push(ff);
          break;
        }
      }
      if (uris.length === ret.length) {
        break;
      }
    }

    return ret;
  }

  public async loadConfigs(): Promise<boolean> {
    this.toolchains = [];

    let file = '';
    try {
      file = await readFileAsync(path.join(this.workspace.uri.fsPath, 'build', this.configFile), 'utf8');
    } catch (err) {
      this.statusBar.show();
      this.binaryTypeStatusBar.show();
      return false;
    }

    this.toolchains = jsonc.parse(file) as IToolChain[];

    if (this.selectedName.Value === 'none') {
      // Look for roborio release first
      const c = this.toolchains[0];
      let name = getToolchainName(c);
      for (const t of this.toolchains) {
        if (t.name === 'linuxathena' && t.buildType === 'release') {
          name = getToolchainName(t);
          break;
        }
      }

      this.selectedName.Value = name;
      this.statusBar.text = this.selectedName.Value;
    }

    let found = false;
    for (const t of this.toolchains) {
      if (getToolchainName(t) === this.selectedName.Value) {
        found = true;
        break;
      }
    }

    if (!found) {
      // Look for roborio release first
      const c = this.toolchains[0];
      let name = getToolchainName(c);
      for (const t of this.toolchains) {
        if (t.name === 'linuxathena' && t.buildType === 'release') {
          name = getToolchainName(t);
          break;
        }
      }
      this.selectedName.Value = name;
      this.statusBar.text = this.selectedName.Value;
    }

    for (const tc of this.toolchains) {
      for (const arg of tc.systemCppArgs) {
        const version = getVersionFromArg(arg);
        if (version !== undefined) {
          tc.cppLangVersion = version;
          break;
        }
      }
      if (tc.cppLangVersion === undefined) {
        tc.cppLangVersion = 'c++17';
      }

      for (const arg of tc.systemCArgs) {
        const version = getVersionFromArg(arg);
        if (version !== undefined) {
          tc.cLangVersion = version;
          break;
        }
      }

      if (tc.cLangVersion === undefined) {
        tc.cLangVersion = 'c11';
      }
    }

    this.foundFiles = [];

    if (!this.registered) {
      this.registered = true;
      this.cppToolsApi.notifyReady(this);
      const currentToolChain = this.getCurrentToolChain();
      if (currentToolChain) {
        this.headerTreeProvider.updateToolChains(currentToolChain, this.enabledBinaryTypes.Value);
      }
      await vscode.commands.executeCommand('setContext', 'isWPILibProvidedCpp', true);
    } else {
      const currentToolChain = this.getCurrentToolChain();
      if (currentToolChain) {
        this.headerTreeProvider.updateToolChains(currentToolChain, this.enabledBinaryTypes.Value);
      }
      this.cppToolsApi.didChangeCustomConfiguration(this);
    }

    this.statusBar.show();
    this.binaryTypeStatusBar.show();
    return true;
  }

  public getCurrentToolChain(): IToolChain | undefined {
    for (const tc of this.toolchains) {
      if (getToolchainName(tc) === this.selectedName.Value) {
        // Found our TC
        return tc;
      }
    }
    return undefined;
  }

  public async selectEnabledBinaryTypes(): Promise<void> {
    const currentTypes = this.enabledBinaryTypes.Value;
    const items = [
      {
        label: 'Executables',
        picked: currentTypes.executables,
        type: 'exe',
      },
      {
        label: 'Shared Libraries',
        picked: currentTypes.sharedLibraries,
        type: 'shared',

      },
      {
        label: 'Static Libraries',
        picked: currentTypes.staticLibraries,
        type: 'static',
      },
    ];
    const selectedItems = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Enable intellisense for the following types of binaries',
    });

    if (selectedItems === undefined) {
      return;
    }

    currentTypes.executables = false;
    currentTypes.sharedLibraries = false;
    currentTypes.staticLibraries = false;

    for (const selected of selectedItems) {
      if (selected.type === 'exe') {
        currentTypes.executables = true;
      } else if (selected.type === 'shared') {
        currentTypes.sharedLibraries = true;
      } else if (selected.type === 'static') {
        currentTypes.staticLibraries = true;
      }
    }

    this.enabledBinaryTypes.Value = currentTypes;
    const currentToolChain = this.getCurrentToolChain();
    if (currentToolChain) {
      this.headerTreeProvider.updateToolChains(currentToolChain, this.enabledBinaryTypes.Value);
    }
  }

  public async selectToolChain(): Promise<void> {
    const selections: string[] = [];
    for (const c of this.toolchains) {
      selections.push(`${c.name} (${c.buildType})`);
    }
    if (selections.length === 0) {
      const configResult = await vscode.window.showInformationMessage('No intellisense configured. Would you like to enable intellisense?', {
        modal: true,
      }, {title: 'Yes'}, {title: 'No', isCloseAffordance: true});
      if (configResult?.title === 'Yes') {
        await this.runGradleRefresh();
      }
      return;
    }
    const result = await vscode.window.showQuickPick(selections, {
      placeHolder: 'Pick a configuration',
    });
    if (result !== undefined) {
      if (result !== this.selectedName.Value) {
        this.foundFiles = [];
      }
      this.selectedName.Value = result;
      this.statusBar.text = result;
      const currentToolChain = this.getCurrentToolChain();
      if (currentToolChain) {
        this.headerTreeProvider.updateToolChains(currentToolChain, this.enabledBinaryTypes.Value);
      }
      this.cppToolsApi.didChangeCustomConfiguration(this);
    }
  }

  public runGradleRefresh(): Promise<number> {
    return gradleRun('generateVsCodeConfig', this.workspace.uri.fsPath, this.workspace, 'C++ Configuration', this.executeApi, this.preferences);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async onCreateOrChange(): Promise<void> {
    await this.loadConfigs();
  }

  private setupWatchers() {
    if (this.gradleWatcher === undefined) {
      const gradlePattern = new vscode.RelativePattern(this.workspace, '**/*.gradle');

      this.gradleWatcher = vscode.workspace.createFileSystemWatcher(gradlePattern);
      this.disposables.push(this.gradleWatcher);

      this.gradleWatcher.onDidChange(this.couldBeUpdated, this, this.disposables);

      this.gradleWatcher.onDidCreate(this.couldBeUpdated, this, this.disposables);

      this.gradleWatcher.onDidDelete(this.couldBeUpdated, this, this.disposables);

      onVendorDepsChanged(async (wp) => {
        if (wp.index === this.workspace.index) {
          await this.couldBeUpdated();
        }
      }, this, this.disposables);
    }
  }

  private onDelete() {
    this.statusBar.text = 'none';
    this.foundFiles = [];
    this.toolchains = [];
  }

  private async couldBeUpdated(): Promise<void> {
    if (!ApiProvider.promptForUpdates) {
      return;
    }
    const result = await vscode.window.showInformationMessage('Intellisense configurations might have been updated. Refresh them now?',
      {title: 'Yes'}, {title: 'No', isCloseAffordance: true});
    if (result && result.title === 'Yes') {
      await this.runGradleRefresh();
    }
  }

  private async findMatchingBinary(uri: vscode.Uri): Promise<boolean> {
    const uriPath = uri.toString();

    for (const f of this.foundFiles) {
      if (f.uri === uriPath) {
        return true;
      }
    }

    logger.log(`Searching for Binary for ${uriPath}`);

    const normalizedPath = normalizeDriveLetter(uri.fsPath);

    const currentBinaryTypes = this.enabledBinaryTypes.Value;

    for (const tc of this.toolchains) {
      if (getToolchainName(tc) === this.selectedName.Value) {
        for (const sb of tc.sourceBinaries) {
          if (sb.executable === true && currentBinaryTypes.executables === false) {
            continue;
          }

          if (sb.sharedLibrary === true && currentBinaryTypes.sharedLibraries === false) {
            continue;
          }

          if (sb.executable === false && sb.sharedLibrary === false && currentBinaryTypes.staticLibraries === false) {
            continue;
          }

          for (const source of sb.source.srcDirs) {
            if (normalizedPath.startsWith(source)) {
              if (!matchesIncludesExcludes(sb.source, normalizedPath)) {
                continue;
              }
              // Found, find binary
              const index: number = tc.nameBinaryMap[sb.componentName];
              if (index >= 0) {
                const bin = tc.binaries[index];
                logger.log(`Found Binary for ${uriPath}`, bin);
                if (sb.cpp) {
                  const args: string[] = [];
                  args.push(...tc.systemCppArgs);
                  args.push(...sb.args);
                  const macros: string[] = [];
                  macros.push(...tc.systemCppMacros);
                  macros.push(...sb.macros);
                  const includePaths: string[] = [];
                  includePaths.push(...bin.libHeaders);

                  // Compute the cpp language version
                  if (sb.langVersionSet === undefined) {
                    sb.langVersionSet = true;
                    for (const arg of sb.args) {
                      sb.langVersion = getVersionFromArg(arg);
                      if (sb.langVersion !== undefined) {
                        break;
                      }
                    }
                    if (sb.langVersion === undefined) {
                      sb.langVersion = tc.cppLangVersion;
                    }
                  }

                  for (const s of bin.sourceSets) {
                    includePaths.push(...s.exportedHeaders.srcDirs);
                  }
                  this.foundFiles.push({
                    configuration: {
                      compilerPath: tc.cppPath,
                      defines: macros,
                      includePath: includePaths,
                      compilerArgs: args,
                      standard: sb.langVersion!,
                    },
                    uri: uriPath,
                  });
                  return true;
                } else {
                  const args: string[] = [];
                  args.push(...tc.systemCArgs);
                  args.push(...sb.args);
                  const macros: string[] = [];
                  macros.push(...tc.systemCMacros);
                  macros.push(...sb.macros);
                  const includePaths: string[] = [];
                  includePaths.push(...bin.libHeaders);

                  // Compute the cpp language version
                  if (sb.langVersionSet === undefined) {
                    sb.langVersionSet = true;
                    for (const arg of sb.args) {
                      sb.langVersion = getVersionFromArg(arg);
                      if (sb.langVersion !== undefined) {
                        break;
                      }
                    }
                    if (sb.langVersion === undefined) {
                      sb.langVersion = tc.cLangVersion;
                    }
                  }

                  for (const s of bin.sourceSets) {
                    includePaths.push(...s.exportedHeaders.srcDirs);
                  }
                  this.foundFiles.push({
                    configuration: {
                      compilerPath: tc.cPath,
                      defines: macros,
                      includePath: includePaths,
                      compilerArgs: args,
                      standard: sb.langVersion!,
                    },
                    uri: uriPath,
                  });
                  return true;
                }
              }
            }
          }
        }
        for (const alf of tc.allLibFiles) {
          if (normalizedPath.startsWith(alf)) {
            logger.log(`Found global lib for ${uriPath}`);
            const args: string[] = [];
            args.push(...tc.systemCppArgs);
            const macros: string[] = [];
            macros.push(...tc.systemCppMacros);
            const includePaths: string[] = [];
            includePaths.push(...tc.allLibFiles);
            this.foundFiles.push({
              configuration: {
                compilerPath: tc.cppPath,
                defines: macros,
                includePath: includePaths,
                compilerArgs: args,
                standard: 'c++20',
              },
              uri: uriPath,
            });
            return true;
          }
        }
      }
    }
    logger.log(`Did not find provider for ${uriPath}`);
    return false;
  }
}
