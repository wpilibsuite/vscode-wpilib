'use strict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { CppToolsApi, CustomConfigurationProvider, SourceFileConfigurationItem, WorkspaceBrowseConfiguration } from 'vscode-cpptools';
import { IExecuteAPI, IExternalAPI, IPreferences } from 'vscode-wpilibapi';
import { logger } from '../logger';
import { PersistentFolderState } from '../persistentState';
import { gradleRun, promisifyReadFile } from '../utilities';
import { onVendorDepsChanged } from '../vendorlibraries';
import { HeaderExplorer } from './headertreeprovider';
import { IToolChain } from './jsonformats';

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

export class ApiProvider implements CustomConfigurationProvider {
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
  private readonly configFile: string = 'vscodeconfig.json';
  private configRelativePattern: vscode.RelativePattern;
  private configWatcher: vscode.FileSystemWatcher;

  private gradleWatcher: vscode.FileSystemWatcher | undefined;

  private executeApi: IExecuteAPI;

  constructor(workspace: vscode.WorkspaceFolder, cppToolsApi: CppToolsApi, externalApi: IExternalAPI, resourceRoot: string) {
    this.preferences = externalApi.getPreferencesAPI().getPreferences(workspace);
    this.workspace = workspace;
    this.cppToolsApi = cppToolsApi;
    this.executeApi = externalApi.getExecuteAPI();
    this.cppToolsApi.registerCustomConfigurationProvider(this);
    this.headerTreeProvider = new HeaderExplorer(resourceRoot);

    const fsPath = workspace.uri.fsPath;

    this.configRelativePattern = new vscode.RelativePattern(path.join(fsPath, 'build'), this.configFile);
    this.configWatcher = vscode.workspace.createFileSystemWatcher(this.configRelativePattern);
    this.disposables.push(this.configWatcher);
    this.selectedName = new PersistentFolderState<string>('gradleProperties.selectedName', 'none', fsPath);

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 2);
    this.statusBar.text = this.selectedName.Value;
    this.statusBar.tooltip = 'Click to change toolchain';
    this.statusBar.command = 'wpilibcore.selectCppToolchain';

    this.disposables.push(this.statusBar);

    // tslint:disable-next-line:no-unbound-method
    this.disposables.push(this.configWatcher.onDidChange(this.onCreateOrChange, this));
    // tslint:disable-next-line:no-unbound-method
    this.disposables.push(this.configWatcher.onDidCreate(this.onCreateOrChange, this));
    // tslint:disable-next-line:no-unbound-method
    this.disposables.push(this.configWatcher.onDidDelete(this.onDelete, this));

    this.setupWatchers();

    this.disposables.push(this.headerTreeProvider);

    this.loadConfigs().then(async (found) => {
      if (!found) {
        await this.runGradleRefresh();
        return;
      }
    }).catch((err) => {
      logger.error('Rejected load?', err);
    });
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
        standard: 'c++14',
      };
      return config;
    } else {
      const config: WorkspaceBrowseConfiguration = {
        browsePath,
        compilerPath,
        standard: 'c++14',
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
      file = await promisifyReadFile(path.join(this.workspace.uri.fsPath, 'build', this.configFile));
    } catch (err) {
      this.statusBar.show();
      return false;
    }

    const newToolchains: IToolChain[] = jsonc.parse(file) as IToolChain[];
    for (const newToolChain of newToolchains) {
      let foundTc = false;
      for (const existingChain of this.toolchains) {
        if (newToolChain.architecture === existingChain.architecture &&
          newToolChain.operatingSystem === existingChain.operatingSystem &&
          newToolChain.flavor === existingChain.flavor &&
          newToolChain.buildType === existingChain.buildType) {
          foundTc = true;
          existingChain.binaries.push(...newToolChain.binaries);
        }
      }
      if (!foundTc) {
        this.toolchains.push(newToolChain);
      }
    }

    if (this.selectedName.Value === 'none') {
      // Look for roborio release first
      const c = this.toolchains[0];
      let name = getToolchainName(c);
      for (const t of this.toolchains) {
        if (t.name === 'roborio' && t.buildType === 'release') {
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
        if (t.name === 'roborio' && t.buildType === 'release') {
          name = getToolchainName(t);
          break;
        }
      }
      this.selectedName.Value = name;
      this.statusBar.text = this.selectedName.Value;
    }

    this.foundFiles = [];

    if (!this.registered) {
      this.registered = true;
      this.cppToolsApi.notifyReady(this);
      const currentToolChain = this.getCurrentToolChain();
      if (currentToolChain) {
        this.headerTreeProvider.updateToolChains(currentToolChain);
      }
      await vscode.commands.executeCommand('setContext', 'isWPILibProvidedCpp', true);
    } else {
      const currentToolChain = this.getCurrentToolChain();
      if (currentToolChain) {
        this.headerTreeProvider.updateToolChains(currentToolChain);
      }
      this.cppToolsApi.didChangeCustomConfiguration(this);
    }

    this.statusBar.show();
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

  public async selectToolChain(): Promise<void> {
    const selections: string[] = [];
    for (const c of this.toolchains) {
      selections.push(`${c.name} (${c.buildType})`);
    }
    if (selections.length === 0) {
      const configResult = await vscode.window.showInformationMessage('No intellisense configured. Would you like to enable intellisense?', {
        modal: true,
      }, 'Yes', 'No');
      if (configResult === 'Yes') {
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
        this.headerTreeProvider.updateToolChains(currentToolChain);
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

      // tslint:disable-next-line:no-unbound-method
      this.gradleWatcher.onDidChange(this.couldBeUpdated, this, this.disposables);

      // tslint:disable-next-line:no-unbound-method
      this.gradleWatcher.onDidCreate(this.couldBeUpdated, this, this.disposables);

      // tslint:disable-next-line:no-unbound-method
      this.gradleWatcher.onDidDelete(this.couldBeUpdated, this, this.disposables);

      // tslint:disable-next-line:no-unbound-method
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
    const result = await vscode.window.showInformationMessage('Intellisense configurations might have been updated. Refresh them now?', 'Yes', 'No');
    if (result && result === 'Yes') {
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

    for (const tc of this.toolchains) {
      if (getToolchainName(tc) === this.selectedName.Value) {
        for (const sb of tc.sourceBinaries) {
          for (const source of sb.source.srcDirs) {
            if (normalizedPath.startsWith(source)) {
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
                  for (const s of bin.sourceSets) {
                    includePaths.push(...s.exportedHeaders.srcDirs);
                  }
                  this.foundFiles.push({
                    configuration: {
                      compilerPath: tc.cppPath,
                      defines: macros,
                      includePath: includePaths,
                      intelliSenseMode: tc.msvc ? 'msvc-x64' : 'clang-x64',
                      standard: 'c++14',
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
                  for (const s of bin.sourceSets) {
                    includePaths.push(...s.exportedHeaders.srcDirs);
                  }
                  this.foundFiles.push({
                    configuration: {
                      compilerPath: tc.cPath,
                      defines: macros,
                      includePath: includePaths,
                      intelliSenseMode: tc.msvc ? 'msvc-x64' : 'clang-x64',
                      standard: 'c11',
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
                intelliSenseMode: tc.msvc ? 'msvc-x64' : 'clang-x64',
                standard: 'c++14',
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
