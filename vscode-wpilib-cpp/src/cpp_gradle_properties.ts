import * as vscode from 'vscode';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';

export class CppGradleProperties {
  private disposables: vscode.Disposable[] = [];

  private libraryHeaderDirs: string[] = [];
  private localHeaderDirs: string[] = [];

  private libraryHeaderDirsChanged: vscode.EventEmitter<string[]>;
  public readonly onDidChangeLibraryHeaderDirectories: vscode.Event<string[]>;
  private localHeaderDirsChanged: vscode.EventEmitter<string[]>;
  public readonly onDidChangeLocalHeaderDirectories: vscode.Event<string[]>;

  private workspace: vscode.WorkspaceFolder;
  private readonly gradleJsonFileLoc: string = 'build/buildProps.json';
  private readonly gradlePropsCommand: string = '';

  public constructor(wp: vscode.WorkspaceFolder) {
    this.workspace = wp;

    let buildPropertiesRelativePattern = new vscode.RelativePattern(wp, this.gradleJsonFileLoc);

    let buildPropertiesListener = vscode.workspace.createFileSystemWatcher(buildPropertiesRelativePattern);

    buildPropertiesListener.onDidCreate(() => {
      // Reread and fire
    });

    buildPropertiesListener.onDidDelete(() => {
      // Delete existing and fire
    });

    buildPropertiesListener.onDidChange(() => {
      // Check which properties changed, and fire new ones
    });

    let current: string | undefined;

    try {
      current = fs.readFileSync(this.gradleJsonFileLoc, 'utf8');
    } catch (error) {

    }

    if (current !== undefined) {
      // Load and parse file
    }

    this.libraryHeaderDirsChanged = new vscode.EventEmitter<string[]>();
    this.localHeaderDirsChanged = new vscode.EventEmitter<string[]>();

    this.onDidChangeLibraryHeaderDirectories = this.libraryHeaderDirsChanged.event;
    this.onDidChangeLocalHeaderDirectories = this.localHeaderDirsChanged.event;

    this.disposables.push(this.libraryHeaderDirsChanged);
    this.disposables.push(this.libraryHeaderDirsChanged);
  }

  private parseFile(contents: string) {

  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
