'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';

interface PreferencesJson {
  selectedComponent?: string;
  additionalIncludeDirectories?: string[];
  additionalDefines?: string[];
  additionalDebugCommands?: string[];
}

const defaultPreferences: PreferencesJson = {};

export class CppPreferences {
  private preferencesFile?: vscode.Uri;
  private readonly configFolder: string;
  private readonly preferenceFileName: string = 'wpilib_cpp_preferences.json';
  private preferencesJson: PreferencesJson;
  private configFileWatcher: vscode.FileSystemWatcher;
  private readonly preferencesGlob: string = '**/' + this.preferenceFileName;
  private disposables: vscode.Disposable[] = [];
  public workspace: vscode.WorkspaceFolder;

  constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;

    this.configFolder = path.join(workspace.uri.fsPath, '.wpilib');

    let configFilePath = path.join(this.configFolder, this.preferenceFileName);

    if (fs.existsSync(configFilePath)) {
      this.preferencesFile = vscode.Uri.file(configFilePath);
      this.preferencesJson = defaultPreferences;
      this.updatePreferences();
    } else {
      // Set up defaults, and create
      this.preferencesJson = defaultPreferences;
    }

    let rp = new vscode.RelativePattern(workspace, this.preferencesGlob);

    this.configFileWatcher = vscode.workspace.createFileSystemWatcher(rp);
    this.disposables.push(this.configFileWatcher);

    this.configFileWatcher.onDidCreate((uri) => {
      this.preferencesFile = uri;
      this.updatePreferences();
    });

    this.configFileWatcher.onDidDelete(() => {
      this.preferencesFile = undefined;
      this.updatePreferences();
    });

    this.configFileWatcher.onDidChange(() => {
      this.updatePreferences();
    });
  }

  private updatePreferences() {
    if (this.preferencesFile === undefined) {
      this.preferencesJson = defaultPreferences;
      return;
    }

    let results = fs.readFileSync(this.preferencesFile.fsPath, 'utf8');
    this.preferencesJson = jsonc.parse(results);
  }

  public getSelectedComponent(): string | undefined {
    return this.preferencesJson.selectedComponent;
  }

  public getAdditionalIncludeDirectories(): string[] {
    let res = this.preferencesJson.additionalIncludeDirectories;
    if (res === undefined) {
      return [];
    }
    return res;
  }

  public getAdditionalDefines(): string[] {
    let res = this.preferencesJson.additionalDefines;
    if (res === undefined) {
      return [];
    }
    return res;
  }

  public getAdditionalDebugCommands(): string[] {
    let res = this.preferencesJson.additionalDebugCommands;
    if (res === undefined) {
      return [];
    }
    return res;
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
