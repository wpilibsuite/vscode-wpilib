'use strict';
import * as vscode from 'vscode';
import { CppGradleProperties } from './cpp_gradle_properties';
import { CppPreferences } from './cpp_preferences';

export class CppVsCodeProperties {
  private gradleProps: CppGradleProperties;
  private cppPreferences: CppPreferences;
  private workspace: vscode.WorkspaceFolder;
  private isRoboRio: boolean = true;

  public constructor(wp: vscode.WorkspaceFolder, gp: CppGradleProperties,  prefs: CppPreferences) {
    this.gradleProps = gp;
    this.cppPreferences = prefs;
    this.workspace = wp;

    gp.onDidPropertiesChange(async () => {
      await this.updateCppConfigurationFile();
    });
  }

  public async toggleConfiguration(): Promise<boolean> {
    this.isRoboRio = !this.isRoboRio;
    await this.updateCppConfigurationFile();
    return this.isRoboRio;
  }

  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('C_Cpp.default', this.workspace.uri);
  }

  private getDisableUpdate(): boolean {
    const res = vscode.workspace.getConfiguration('wpilibcpp', this.workspace.uri).get<boolean>('disableCppProperties');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  private async updateCppConfigurationFile() : Promise<void> {
    if (this.getDisableUpdate()) {
      return;
    }

    const includes: string[] = this.cppPreferences.getAdditionalIncludeDirectories();
    const defines: string[] = this.cppPreferences.getAdditionalDefines();

    const compiler = this.gradleProps.getCompiler();

    includes.push(...this.gradleProps.getLibraryHeaders());
    includes.push(...this.gradleProps.getLocalHeaders());

    const config = this.getConfiguration();

    await config.update('browse.path', includes, vscode.ConfigurationTarget.WorkspaceFolder);
    await config.update('includePath', includes, vscode.ConfigurationTarget.WorkspaceFolder);
    await config.update('cppStandard', 'c++14', vscode.ConfigurationTarget.WorkspaceFolder);
    await config.update('cStandard', 'c11', vscode.ConfigurationTarget.WorkspaceFolder);
    await config.update('intelliSenseMode', 'clang-x64', vscode.ConfigurationTarget.WorkspaceFolder);
    await config.update('compilerPath', compiler, vscode.ConfigurationTarget.WorkspaceFolder);
    await config.update('defines', defines, vscode.ConfigurationTarget.WorkspaceFolder);
    await config.update('browse.limitSymbolsToIncludedHeaders', true, vscode.ConfigurationTarget.WorkspaceFolder);
  }

  public dispose() {
  }
}
