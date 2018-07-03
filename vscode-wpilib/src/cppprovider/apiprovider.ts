'use-strict';

import * as vscode from 'vscode';
import { CppToolsApi, CustomConfigurationProvider, SourceFileConfiguration, SourceFileConfigurationItem } from 'vscode-cpptools';
import { IExternalAPI } from '../shared/externalapi';
import { GradleConfig, IBinaryFind } from './gradleconfig';

function parseLanguage(_: string[], isCpp: boolean): string {
  if (!isCpp) {
    return 'c11';
  }

  const arg = 'c++14';
  // Todo make this work
  return arg;
}

function getSourceFileConfiguration(file: IBinaryFind): SourceFileConfiguration {
  const ret: SourceFileConfiguration = {
    compilerPath: file.compiler,
    defines: file.macros,
    includePath: file.includePaths,
    intelliSenseMode: file.msvc ? 'msvc-x64' : 'clang-x64',
    standard: parseLanguage(file.args, file.cpp),
  };
  return ret;
}

export class ApiProvider implements CustomConfigurationProvider {
  public extensionId: string = 'vscode-wpilib';
  public name: string = 'WPILib';
  public workspace: vscode.WorkspaceFolder;
  private gradleConfig: GradleConfig;
  private disposables: vscode.Disposable[] = [];
  private cppToolsApi: CppToolsApi;
  private registered: boolean = false;

  constructor(workspace: vscode.WorkspaceFolder, cppToolsApi: CppToolsApi, externalApi: IExternalAPI) {
    this.workspace = workspace;
    this.gradleConfig = new GradleConfig(workspace, externalApi.getPreferencesAPI().getPreferences(workspace),
                                         externalApi.getExecuteAPI());
    this.disposables.push(this.gradleConfig);
    this.cppToolsApi = cppToolsApi;

    /* tslint:disable-next-line:no-floating-promises */
    this.gradleConfig.loadConfigs().then((found) => {
      if (found && !this.registered) {
        this.cppToolsApi.registerCustomConfigurationProvider(this);
        this.gradleConfig.refreshEvent.event(() => {
          this.cppToolsApi.didChangeCustomConfiguration(this);
        });
        this.registered = true;
      }
    }).catch(() => {
      console.log('Rejected load?');
    });
  }

  public async canProvideConfiguration(uri: vscode.Uri, _?: vscode.CancellationToken | undefined): Promise<boolean> {
    const fileWp = vscode.workspace.getWorkspaceFolder(uri);
    if (fileWp === undefined || fileWp.index !== this.workspace.index) {
      return false;
    }
    const bins = await this.gradleConfig.findMatchingBinary([uri]);
    return bins.length !== 0;
  }
  public async provideConfigurations(uris: vscode.Uri[], _?: vscode.CancellationToken | undefined): Promise<SourceFileConfigurationItem[]> {
    const bins = await this.gradleConfig.findMatchingBinary([...uris]);
    const ret: SourceFileConfigurationItem[] = [];
    for (const b of bins) {
      ret.push({
        configuration: getSourceFileConfiguration(b),
        uri: b.uri.fsPath,
      });
    }
    // console.log(JSON.stringify(ret, null, 4));
    return ret;
  }

  public async loadConfigs(): Promise<void> {
    const found = this.gradleConfig.loadConfigs();

    if (found && !this.registered) {
      this.cppToolsApi.registerCustomConfigurationProvider(this);
      this.gradleConfig.refreshEvent.event(() => {
        this.cppToolsApi.didChangeCustomConfiguration(this);
      });
      this.registered = true;
    }
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
