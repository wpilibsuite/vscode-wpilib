'use strict';

import * as glob from 'glob';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { CppToolsApi, CustomConfigurationProvider, SourceFileConfigurationItem } from 'vscode-cpptools';
import { IExecuteAPI, IExternalAPI, IPreferences } from '../shared/externalapi';
import { gradleRun, promisifyReadFile } from '../utilities';
import { ISource, IToolChain } from './jsonformats';
import { PersistentFolderState } from './persistentState';

const isWindows = (process.platform === 'win32');

function hasDriveLetter(pth: string): boolean {
  return isWindows && pth[1] === ':';
}

function normalizeDriveLetter(pth: string): string {
  if (hasDriveLetter(pth)) {
    return pth.charAt(0).toUpperCase() + pth.slice(1);
  }

  return pth;
}

async function enumerateSourceSet(source: ISource): Promise<string[]> {
  const files: string[] = [];
  for (const s of source.srcDirs) {
    const includes: string = '**/*';
    // TODO: Figure out includes
    /*
    if (source.includes.length !== 0) {
      includes = '{';
      let first = true;
      for (const i of source.includes) {
        if (first) {
          first = false;
        } else {
          includes += ',';
        }
        includes += i;
      }
      includes += '}';
    }
    */

    const excludes: string = '';
    /*
    if (source.excludes.length !== 0) {
      excludes = '{';
      let first = true;
      for (const i of source.excludes) {
        if (first) {
          first = false;
        } else {
          excludes += ',';
        }
        excludes += i;
      }
      excludes += '}';
    }
    */
    files.push(...await new Promise<string[]>((resolve, reject) => {
      glob(includes, {
        cwd: s,
        ignore: excludes,
        nodir: true,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const newArr: string[] = [];
          for (const d of data) {
            newArr.push(path.join(s, d));
          }
          resolve(newArr);
        }
      });
    }));
  }
  return files;
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

  private toolchains: IToolChain[] = [];
  private foundFiles: SourceFileConfigurationItem[] = [];
  private selectedName: PersistentFolderState<string>;
  private statusBar: vscode.StatusBarItem;
  private readonly configFile: string = 'vscodeconfig.json';
  private configRelativePattern: vscode.RelativePattern;
  private configWatcher: vscode.FileSystemWatcher;
  private executeApi: IExecuteAPI;

  constructor(workspace: vscode.WorkspaceFolder, cppToolsApi: CppToolsApi, externalApi: IExternalAPI) {
    this.preferences = externalApi.getPreferencesAPI().getPreferences(workspace);
    this.workspace = workspace;
    this.cppToolsApi = cppToolsApi;
    this.executeApi = externalApi.getExecuteAPI();

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

    this.disposables.push(this.configWatcher.onDidChange(this.onCreateOrChange));
    this.disposables.push(this.configWatcher.onDidCreate(this.onCreateOrChange));
    this.disposables.push(this.configWatcher.onDidDelete(this.onDelete));

    this.loadConfigs().then(async (found) => {
      if (!found) {
        if (this.preferences.getCurrentLanguage() === 'cpp') {
          const configResult = await vscode.window.showInformationMessage('No C++ configurations. Yes to refresh.',
                                                                          'Yes', 'No');
          if (configResult === 'Yes') {
            await this.runGradleRefresh();
          }
          return;
        }
      }
    }).catch(() => {
      console.log('Rejected load?');
    });
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
      this.selectedName.Value = this.toolchains[0].name;
      this.statusBar.text = this.selectedName.Value;
    }

    let found = false;
    for (const t of this.toolchains) {
      if (t.name === this.selectedName.Value) {
        found = true;
      }
    }

    if (!found) {
      this.selectedName.Value = this.toolchains[0].name;
      this.statusBar.text = this.selectedName.Value;
    }

    this.foundFiles = [];

    if (!this.registered) {
      this.cppToolsApi.registerCustomConfigurationProvider(this);
      this.registered = true;
    }

    this.cppToolsApi.didChangeCustomConfiguration(this);

    this.statusBar.show();
    return true;
  }

  public async selectToolChain(): Promise<void> {
    const selections: string[] = [];
    for (const c of this.toolchains) {
      selections.push(c.name);
    }
    if (selections.length === 0) {
      const configResult = await vscode.window.showInformationMessage('No configuration. Would you like to refresh the configurations?', 'Yes', 'No');
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
      this.cppToolsApi.didChangeCustomConfiguration(this);
    }
  }

  public runGradleRefresh(): Promise<number> {
    const online = this.preferences.getOnline();
    return gradleRun('generateVsCodeConfig', this.workspace.uri.fsPath, this.workspace, online, 'C++ Configuration', this.executeApi);
  }

  public async dispose(): Promise<void> {
    for (const d of this.disposables) {
      await d.dispose();
    }
  }

  private async onCreateOrChange(): Promise<void> {
    await this.loadConfigs();
  }

  private onDelete() {
    this.statusBar.text = 'none';
    this.foundFiles = [];
    this.toolchains = [];
  }

  private async findMatchingBinary(uri: vscode.Uri): Promise<boolean> {
    const uriPath = uri.toString();

    for (const f of this.foundFiles) {
      if (f.uri === uriPath) {
        return true;
      }
    }

    const normalizedPath = normalizeDriveLetter(uri.fsPath);

    for (const tc of this.toolchains) {
      if (tc.name === this.selectedName.Value) {
        for (const sb of tc.sourceBinaries) {
          const files = await enumerateSourceSet(sb.source);
          for (const file of files) {
            if (normalizedPath === file) {
              // Found, find binary
              const index: number = tc.nameBinaryMap[sb.componentName];
              console.log(index);
              if (index) {
                const bin = tc.binaries[index];
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
      }
    }
    return false;
  }
}
