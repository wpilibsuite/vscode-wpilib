'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import { gradleRun } from './gradle';
import { CppPreferences } from './cpp_preferences';

interface IComponent {
  launchFile: string;
  srcDirs: string[];
  exportedHeaders: string[];
  libHeaderDirs: string[];
  libSharedFilePaths: string[];
}

interface IComponentMap {
  [name: string]: IComponent;
}

interface ICompiler {
  toolchainDir: string;
  gdbPath: string;
  compilerPath: string;
  sysroot: string | null;
}

interface IEditorConfig {
  compiler: ICompiler;
  components: IComponentMap;
}

const defaultConfig: IEditorConfig = {
  compiler: {
    toolchainDir: '',
    gdbPath: '',
    compilerPath: '',
    sysroot: null
  },
  components: {
  }
};

export class CppGradleProperties {
  private disposables: vscode.Disposable[] = [];

  private libraryHeaderDirs: string[] = [];
  private localHeaderDirs: string[] = [];

  private lastConfig: IEditorConfig = defaultConfig;

  private libraryHeaderDirsChanged: vscode.EventEmitter<string[]>;
  public readonly onDidChangeLibraryHeaderDirectories: vscode.Event<string[]>;
  private localHeaderDirsChanged: vscode.EventEmitter<string[]>;
  public readonly onDidChangeLocalHeaderDirectories: vscode.Event<string[]>;
  private propertiesChange: vscode.EventEmitter<void>;
  public readonly onDidPropertiesChange: vscode.Event<void>;

  private cppPreferences: CppPreferences;

  private outputWriter: vscode.OutputChannel;

  private workspace: vscode.WorkspaceFolder;
  private readonly gradleJsonFileLoc: string = '**/.editcfg';

  public constructor(wp: vscode.WorkspaceFolder, ow: vscode.OutputChannel, cppPrefs: CppPreferences) {
    this.workspace = wp;
    this.outputWriter = ow;
    this.cppPreferences = cppPrefs;

    let buildPropertiesRelativePattern = new vscode.RelativePattern(wp, this.gradleJsonFileLoc);

    let buildPropertiesListener = vscode.workspace.createFileSystemWatcher(buildPropertiesRelativePattern);

    this.disposables.push(buildPropertiesListener);

    this.libraryHeaderDirsChanged = new vscode.EventEmitter<string[]>();
    this.localHeaderDirsChanged = new vscode.EventEmitter<string[]>();
    this.propertiesChange = new vscode.EventEmitter<void>();

    this.onDidChangeLibraryHeaderDirectories = this.libraryHeaderDirsChanged.event;
    this.onDidChangeLocalHeaderDirectories = this.localHeaderDirsChanged.event;
    this.onDidPropertiesChange = this.propertiesChange.event;

    this.disposables.push(this.libraryHeaderDirsChanged);
    this.disposables.push(this.libraryHeaderDirsChanged);
    this.disposables.push(this.propertiesChange);

    buildPropertiesListener.onDidCreate((file) => {
      let current: string | undefined;
      try {
        current = fs.readFileSync(file.fsPath, 'utf8');
      } catch (error) {
      }

      if (current === undefined) {
        this.lastConfig = defaultConfig;
        this.libraryHeaderDirsChanged.fire([]);
        this.localHeaderDirsChanged.fire([]);
        this.propertiesChange.fire();
        return;
      }

      let parsed: IEditorConfig = jsonc.parse(current);
      this.loadNewFile(parsed);
    });

    buildPropertiesListener.onDidDelete(() => {
      // Delete existing and fire
      this.lastConfig = defaultConfig;
      this.libraryHeaderDirsChanged.fire([]);
      this.localHeaderDirsChanged.fire([]);
      this.propertiesChange.fire();
    });

    buildPropertiesListener.onDidChange((file) => {
      // Check which properties changed, and fire new ones
      let current: string | undefined;
      try {
        current = fs.readFileSync(file.fsPath, 'utf8');
      } catch (error) {
      }

      if (current === undefined) {
        this.lastConfig = defaultConfig;
        this.libraryHeaderDirsChanged.fire([]);
        this.localHeaderDirsChanged.fire([]);
        this.propertiesChange.fire();
        return;
      }

      let parsed: IEditorConfig = jsonc.parse(current);
      this.checkForChanges(parsed);
    });

    this.forceReparse();
  }

  private checkForChanges(newContents: IEditorConfig) {
    let newKey = this.getSelectedComponent(newContents.components);
    let oldKey = this.getSelectedComponent(this.lastConfig.components);
    if (newKey === undefined) {
      // Empty, return default
      this.lastConfig = defaultConfig;
      this.libraryHeaderDirsChanged.fire([]);
      this.localHeaderDirsChanged.fire([]);
      this.propertiesChange.fire();
      return;
    }
    if (oldKey === undefined || newKey !== oldKey) {
      this.loadNewFile(newContents);
      return;
    }

    let component = newContents.components[newKey];
    let oldComponent = this.lastConfig.components[oldKey];

    let newLibraryHeaders = component.libHeaderDirs;
    let oldLibraryHeaders = oldComponent.libHeaderDirs;

    if (newLibraryHeaders.length !== oldLibraryHeaders.length) {
      this.libraryHeaderDirs = newLibraryHeaders;
      this.libraryHeaderDirsChanged.fire(this.libraryHeaderDirs);
    } else {
      for (let n of newLibraryHeaders) {
        let found = false;
        for (let o of oldLibraryHeaders) {
          if (o === n) {
            found = true;
            break;
          }
        }
        if (!found) {
          this.libraryHeaderDirs = newLibraryHeaders;
          this.libraryHeaderDirsChanged.fire(this.libraryHeaderDirs);
          break;
        }
      }
    }

    let newLocalHeaders = component.libHeaderDirs;
    let oldLocalHeaders = oldComponent.libHeaderDirs;

    if (newLocalHeaders.length !== oldLocalHeaders.length) {
      this.localHeaderDirs = newLocalHeaders;
      this.localHeaderDirsChanged.fire(this.localHeaderDirs);
    } else {
      for (let n of newLocalHeaders) {
        let found = false;
        for (let o of oldLocalHeaders) {
          if (o === n) {
            found = true;
            break;
          }
        }
        if (!found) {
          this.localHeaderDirs = newLocalHeaders;
          this.localHeaderDirsChanged.fire(this.localHeaderDirs);
          break;
        }
      }
    }

    this.lastConfig = newContents;
    this.propertiesChange.fire();
  }

  private getSelectedComponent(components: IComponentMap): string | undefined {
    let componentKeys = Object.keys(components);
    let currentKey: string = '';
    if (componentKeys.length === 0) {
      console.log('No components found');
      return undefined;
    }
    if (componentKeys.length === 1) {
      currentKey = componentKeys[0];
    } else {
      let component = this.cppPreferences.getSelectedComponent();
      if (component === undefined) {
        console.log('No components found');
        return undefined;
      }
      if (componentKeys.indexOf(component) >= 0) {
        currentKey = component;
      } else {
        console.log('No components found');
        return undefined;
      }
    }
    return currentKey;
  }

  public async runGradleRefresh(): Promise<void> {
    this.outputWriter.clear();
    this.outputWriter.show();
    await gradleRun('editorConfig', this.workspace.uri.fsPath, this.outputWriter);
    this.forceReparse();
  }

  public forceReparse() {
    let current: string | undefined;

    try {
      let fPath = path.join(this.workspace.uri.fsPath, this.gradleJsonFileLoc);
      current = fs.readFileSync(fPath, 'utf8');
    } catch (error) {

    }

    if (current !== undefined) {
      // Load and parse file
      let parsed: IEditorConfig = jsonc.parse(current);
      this.loadNewFile(parsed);
    }
  }

  private loadNewFile(contents: IEditorConfig) {
    let currentKey = this.getSelectedComponent(contents.components);
    if (currentKey === undefined) {
      return;
    }
    this.libraryHeaderDirs = contents.components[currentKey].libHeaderDirs;
    this.localHeaderDirs = contents.components[currentKey].exportedHeaders;
    this.lastConfig = contents;
    this.libraryHeaderDirsChanged.fire(this.libraryHeaderDirs);
    this.localHeaderDirsChanged.fire(this.localHeaderDirs);
    this.propertiesChange.fire();
  }

  public getSysRoot(): string {
    let sysroot = this.lastConfig.compiler.sysroot;
    if (sysroot === null) {
      return '';
    }
    return sysroot;
  }

  public getCompiler(): string {
    return this.lastConfig.compiler.compilerPath;
  }

  public getLocalHeaders(): string[] {
    return this.localHeaderDirs;
  }

  public getLibraryHeaders(): string[] {
    return this.libraryHeaderDirs;
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
