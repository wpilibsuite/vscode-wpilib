'use strict';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { mkdirAsync, writeFileAsync } from '../utilities';

interface IPreferencesJson {
  mainFile?: string;
}

const defaultPreferences: IPreferencesJson = {
};

export class PyPreferences {
  public workspace: vscode.WorkspaceFolder;
  private preferencesFile?: vscode.Uri;
  private readonly configFolder: string;
  private readonly preferenceFileName: string = 'python_preferences.json';
  private preferencesJson: IPreferencesJson;
  private configFileWatcher: vscode.FileSystemWatcher;
  private readonly preferencesGlob: string = '**/' + this.preferenceFileName;
  private disposables: vscode.Disposable[] = [];

  constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;
    this.configFolder = path.join(workspace.uri.fsPath, '.wpilib');

    const configFilePath = path.join(this.configFolder, this.preferenceFileName);

    if (fs.existsSync(configFilePath)) {
      this.preferencesFile = vscode.Uri.file(configFilePath);
      this.preferencesJson = defaultPreferences;
      this.updatePreferences();
    } else {
      // Set up defaults, and create
      this.preferencesJson = defaultPreferences;
    }

    const rp = new vscode.RelativePattern(workspace, this.preferencesGlob);

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

  public async getMainFile(): Promise<string | undefined> {
    if (this.preferencesJson.mainFile === undefined) {
      const selection = await this.requestMainFile();
      if (selection !== undefined) {
        await this.setMainFile(selection);
        return selection;
      }
    }
    return this.preferencesJson.mainFile;
  }

  public async setMainFile(file: string): Promise<void> {
    this.preferencesJson.mainFile = file;
    await this.writePreferences();
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async requestMainFile(): Promise<string | undefined> {
    const glob = await vscode.workspace.findFiles(new vscode.RelativePattern(this.workspace, '*.py'));
    if (glob.length === 0) {
      return undefined;
    }

    const map = glob.map((v) => {
      return path.basename(v.fsPath);
    });

    const selection = await vscode.window.showQuickPick(map, {
      placeHolder: 'Pick a file to be your main file',
    });

    return selection;
  }

  private updatePreferences() {
    if (this.preferencesFile === undefined) {
      this.preferencesJson = defaultPreferences;
      return;
    }

    const results = fs.readFileSync(this.preferencesFile.fsPath, 'utf8');
    this.preferencesJson = jsonc.parse(results) as IPreferencesJson;
  }

  private async writePreferences(): Promise<void> {
    if (this.preferencesFile === undefined) {
      const configFilePath = path.join(this.configFolder, this.preferenceFileName);
      this.preferencesFile = vscode.Uri.file(configFilePath);
      await mkdirAsync(path.dirname(this.preferencesFile.fsPath));
    }
    await writeFileAsync(this.preferencesFile.fsPath, JSON.stringify(this.preferencesJson, null, 4));
  }
}
