'use strict';

import * as jsonc from 'jsonc-parser';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { ToolChain, Source } from './jsonformats';
import * as path from 'path';
import * as glob from 'glob';
import { PersistentFolderState } from './persistentState';
import { IPreferences } from '../shared/externalapi';
import { TaskRunner } from '../shared/gradle';

function promisifyReadFile(location: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(location, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export interface BinaryFind {
  includePaths: string[];
  cpp: boolean;
  compiler: string;
  msvc: boolean;
  macros: string[];
  args: string[];
  uri: vscode.Uri;
}

const isWindows = (process.platform === 'win32');

function hasDriveLetter(pth: string): boolean {
  return isWindows && pth[1] === ':';
}

export function normalizeDriveLetter(pth: string): string {
  if (hasDriveLetter(pth)) {
    return pth.charAt(0).toUpperCase() + pth.slice(1);
  }

  return pth;
}



export class GradleConfig {
  public workspace: vscode.WorkspaceFolder;
  private toolchains: ToolChain[] = [];
  private selectedName: PersistentFolderState<string>;
  private disposables: vscode.Disposable[] = [];

  private foundFiles: BinaryFind[] = [];

  private statusBar: vscode.StatusBarItem;

  private readonly configFile: string = 'vscodeconfig.json';

  private configRelativePattern: vscode.RelativePattern;
  private configWatcher: vscode.FileSystemWatcher;
  public refreshEvent: vscode.EventEmitter<void>;
  private preferences: IPreferences;

  constructor(workspace: vscode.WorkspaceFolder, preferences: IPreferences) {
    this.preferences = preferences;
    this.workspace = workspace;

    this.configRelativePattern = new vscode.RelativePattern(path.join(workspace.uri.fsPath, 'build'), this.configFile);

    this.refreshEvent = new vscode.EventEmitter();

    this.configWatcher = vscode.workspace.createFileSystemWatcher(this.configRelativePattern);

    this.disposables.push(this.configWatcher);

    this.selectedName = new PersistentFolderState<string>('gradleProperties.selectedName', 'none', workspace.uri.fsPath);

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 2);
    this.statusBar.text = this.selectedName.Value;
    this.statusBar.tooltip = 'Click to change toolchain';
    this.statusBar.command = 'gradlevscpp.selectToolchain';

    this.disposables.push(this.statusBar);

    this.configWatcher.onDidCreate(async _ => {
      await this.loadConfigs();
    }, this.disposables);

    this.configWatcher.onDidDelete(_ => {
      this.statusBar.text = 'none';
      this.toolchains = [];
      this.foundFiles = [];
    }, this.disposables);

    this.configWatcher.onDidChange(async _ => {
      await this.loadConfigs();
    }, this.disposables);
  }

  private enumerateSourceSet(source: Source): Promise<string[]>[] {
    const promises: Promise<string[]>[] = [];
    for (const s of source.srcDirs) {
      let includes: string = '**/*';
      if (source.includes.length === 0) {
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

      let excludes: string = '';
      if (source.excludes.length === 0) {
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
      promises.push(new Promise<string[]>((resolve, reject) => {
        glob(includes, {
          cwd: s,
          ignore: excludes,
          nodir: true
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
    return promises;
  }

  public async runGradleRefresh(): Promise<number> {
    const online = this.preferences.getOnline();
    const runner = new TaskRunner();
    let command = './gradlew generateVsCodeConfig';
    if (online === undefined || online === false) {
      command += ' --offline';
    }
    return runner.executeTask(command, 'gradle', this.workspace.uri.fsPath, this.workspace);
  }

  public async findMatchingBinary(uris: vscode.Uri[]): Promise<BinaryFind[]> {

    let findCount = 0;
    const finds: BinaryFind[] = [];

    for (let i = 0; i < uris.length; i++) {
      // Remove non c++ files
      const end1 = uris[i].fsPath.endsWith('.cpp');
      const end2 = uris[i].fsPath.endsWith('.hpp');
      const end3 = uris[i].fsPath.endsWith('.cc');
      const end4 = uris[i].fsPath.endsWith('.hh');
      const end5 = uris[i].fsPath.endsWith('.c');
      const end6 = uris[i].fsPath.endsWith('.h');

      if (!end1 && !end2
        && !end3 && !end4
        && !end5 && !end6) {
        uris.splice(i, 1);
        continue;
      }

      for (const f of this.foundFiles) {
        if (f.uri.fsPath === uris[i].fsPath) {
          findCount++;
          finds.push(f);
          uris.splice(i, 1);
          break;
        }
      }
    }

    if (uris.length === 0) {
      return finds;
    }

    for (const tc of this.toolchains) {
      if (tc.name === this.selectedName.Value) {
        for (const bin of tc.binaries) {
          for (const sourceSet of bin.sourceSets) {
            const arr: Promise<string[]>[] = [];
            arr.push(...this.enumerateSourceSet(sourceSet.source));
            arr.push(...this.enumerateSourceSet(sourceSet.exportedHeaders));
            const matches = await Promise.all(arr);
            for (const set of matches) {
              for (const file of set) {
                for (const uri of uris) {
                  if (normalizeDriveLetter(uri.fsPath) === normalizeDriveLetter(file)) {
                    findCount++;
                    if (sourceSet.cpp) {
                      const args: string[] = [];
                      args.push(...tc.systemCppArgs);
                      args.push(...sourceSet.args);
                      const macros: string[] = [];
                      macros.push(...tc.systemCppMacros);
                      macros.push(...sourceSet.macros);
                      const includePaths: string[] = [];
                      includePaths.push(...bin.libHeaders);
                      for (const s of bin.sourceSets) {
                        includePaths.push(...s.exportedHeaders.srcDirs);
                      }
                      finds.push({
                        args: args,
                        includePaths: includePaths,
                        compiler: tc.cppPath,
                        cpp: true,
                        macros: macros,
                        msvc: tc.msvc,
                        uri: uri
                      });
                    } else {
                      const args: string[] = [];
                      args.push(...tc.systemCArgs);
                      args.push(...sourceSet.args);
                      const macros: string[] = [];
                      macros.push(...tc.systemCMacros);
                      macros.push(...sourceSet.macros);
                      const includePaths: string[] = [];
                      includePaths.push(...bin.libHeaders);
                      for (const s of bin.sourceSets) {
                        includePaths.push(...s.exportedHeaders.srcDirs);
                      }
                      finds.push({
                        args: args,
                        includePaths: includePaths,
                        compiler: tc.cppPath,
                        cpp: false,
                        macros: macros,
                        msvc: tc.msvc,
                        uri: uri
                      });
                    }
                    if (findCount === uris.length) {
                      this.foundFiles.push(...finds);
                      return finds;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    this.foundFiles.push(...finds);
    return finds;
  }

  public async loadConfigs(): Promise<void> {
    this.toolchains = [];

    let file = '';
    try {
      file = await promisifyReadFile(path.join(this.workspace.uri.fsPath, 'build', this.configFile));
    } catch (err) {
      this.statusBar.show();
      return;
    }

    const newToolchains: ToolChain[] = jsonc.parse(file);
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

    this.refreshEvent.fire();

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

    this.statusBar.show();
  }

  public async selectToolChain(): Promise<void> {
    const selections: string[] = [];
    for (const c of this.toolchains) {
      selections.push(c.name);
    }
    if (selections.length === 0) {
      const configResult = await vscode.window.showInformationMessage('No configuration. Would you line to refresh the configurations?', 'Yes', 'No');
      if (configResult === 'Yes') {
        await this.runGradleRefresh();
      }
      return;
    }
    const result = await vscode.window.showQuickPick(selections, {
      placeHolder: 'Pick a configuration'
    });
    if (result !== undefined) {
      this.selectedName.Value = result;
      this.statusBar.text = result;
    }
    this.refreshEvent.fire();
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
