'use-strict';

import { CustomConfigurationProvider, SourceFileConfigurationItem, SourceFileConfiguration, CppToolsApi } from './cppextensionapi';
import * as vscode from 'vscode';
import { GradleConfig, BinaryFind } from './gradleconfig';
import { IPreferencesAPI } from '../shared/externalapi';

function parseLanguage(_: string[], isCpp: boolean): string {
  if (!isCpp) {
    return 'c11';
  }

  const arg = 'c++14';
  // Todo make this work
  return arg;
}

function getSourceFileConfiguration(file: BinaryFind): SourceFileConfiguration {
  const ret: SourceFileConfiguration = {
    standard: parseLanguage(file.args, file.cpp),
    intelliSenseMode: file.msvc ? 'msvc-x64' : 'clang-x64',
    includePath: file.includePaths,
    defines: file.macros,
    compilerPath: file.compiler
  };
  return ret;
}

export class ApiProvider implements CustomConfigurationProvider {

  public workspace: vscode.WorkspaceFolder;
  private gradleConfig: GradleConfig;
  private disposables: vscode.Disposable[] = [];
  private cppToolsApi: CppToolsApi;

  constructor(workspace: vscode.WorkspaceFolder, cppToolsApi: CppToolsApi, preferences: IPreferencesAPI) {
    this.workspace = workspace;
    this.gradleConfig = new GradleConfig(workspace, preferences.getPreferences(workspace));
    this.disposables.push(this.gradleConfig);
    this.cppToolsApi = cppToolsApi;
    this.gradleConfig.loadConfigs().then(() => {
      this.cppToolsApi.registerCustomConfigurationProvider(this);
      this.gradleConfig.refreshEvent.event(() => {
        this.cppToolsApi.didChangeCustomConfiguration(this);
      });
    });
  }

  public name: string = 'wpilib';

  public async canProvideConfiguration(uri: vscode.Uri, _?: vscode.CancellationToken | undefined): Promise<boolean> {
    const fileWp = vscode.workspace.getWorkspaceFolder(uri);
    if (fileWp === undefined || fileWp.index !== this.workspace.index) {
      return false;
    }
    const bins = await this.gradleConfig.findMatchingBinary([uri]);
    return bins.length !== 0;
  }
  public async provideConfigurations(uris: vscode.Uri[], _?: vscode.CancellationToken | undefined): Promise<SourceFileConfigurationItem[]> {
    const bins = await this.gradleConfig.findMatchingBinary(uris);
    const ret: SourceFileConfigurationItem[] = [];
    for (const b of bins) {
      ret.push({
        uri: b.uri.fsPath,
        configuration: getSourceFileConfiguration(b)
      });
    }
    console.log(JSON.stringify(ret, null, 4));
    return ret;
  }

  public loadConfigs(): Promise<void> {
    return this.gradleConfig.loadConfigs();
  }

  public selectToolChain(): Promise<void> {
    return this.gradleConfig.selectToolChain();
  }

  public runGradleRefresh(): Promise<number> {
    return this.gradleConfig.runGradleRefresh();
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
