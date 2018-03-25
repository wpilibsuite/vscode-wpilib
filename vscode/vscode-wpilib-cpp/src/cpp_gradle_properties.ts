'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { gradleRun } from './gradle';
import { CppPreferences } from './cpp_preferences';

function readFileAsync(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export interface IComponent {
  launchfile: string;
  srcDirs: string[];
  exportedHeaders: string[];
  libHeaderDirs: string[];
  libSharedFilePaths: string[];
}

export interface IComponentMap {
  [name: string]: IComponent;
}

export interface ICompiler {
  toolchainDir: string;
  gdbPath: string;
  compilerPath: string;
  sysroot: string | null;
}

interface IEditorConfig {
  compiler: ICompiler;
  components: IComponentMap;
}

export interface ExternalEditorConfig {
  compiler: ICompiler;
  component: IComponent;
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

  private buildPropertiesRelativePattern: vscode.RelativePattern;

  private cppPreferences: CppPreferences;

  private outputWriter: vscode.OutputChannel;

  public workspace: vscode.WorkspaceFolder;
  private readonly gradleJsonFileGlob: string = '**/.editcfg';

  public constructor(wp: vscode.WorkspaceFolder, ow: vscode.OutputChannel, cppPrefs: CppPreferences) {
    this.workspace = wp;
    this.outputWriter = ow;
    this.cppPreferences = cppPrefs;

    this.buildPropertiesRelativePattern = new vscode.RelativePattern(wp, this.gradleJsonFileGlob);

    const buildPropertiesListener = vscode.workspace.createFileSystemWatcher(this.buildPropertiesRelativePattern);

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

      const parsed: IEditorConfig = jsonc.parse(current);
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

      const parsed: IEditorConfig = jsonc.parse(current);
      this.checkForChanges(parsed);
    });
  }

  private checkForChanges(newContents: IEditorConfig) {
    const newKey = this.getSelectedComponent(newContents.components);
    const oldKey = this.getSelectedComponent(this.lastConfig.components);
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

    const component = newContents.components[newKey];
    const oldComponent = this.lastConfig.components[oldKey];

    const newLibraryHeaders = component.libHeaderDirs;
    const oldLibraryHeaders = oldComponent.libHeaderDirs;

    if (newLibraryHeaders.length !== oldLibraryHeaders.length) {
      this.libraryHeaderDirs = newLibraryHeaders;
      this.libraryHeaderDirsChanged.fire(this.libraryHeaderDirs);
    } else {
      for (const n of newLibraryHeaders) {
        let found = false;
        for (const o of oldLibraryHeaders) {
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

    const newLocalHeaders = component.libHeaderDirs;
    const oldLocalHeaders = oldComponent.libHeaderDirs;

    if (newLocalHeaders.length !== oldLocalHeaders.length) {
      this.localHeaderDirs = newLocalHeaders;
      this.localHeaderDirsChanged.fire(this.localHeaderDirs);
    } else {
      for (const n of newLocalHeaders) {
        let found = false;
        for (const o of oldLocalHeaders) {
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
    const componentKeys = Object.keys(components);
    let currentKey: string = '';
    if (componentKeys.length === 0) {
      console.log('No components found');
      return undefined;
    }
    if (componentKeys.length === 1) {
      currentKey = componentKeys[0];
    } else {
      const component = this.cppPreferences.getSelectedComponent();
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
    await this.forceReparse();
  }

  public async forceReparse(): Promise<void> {
    let current: string | undefined;

    const files = await vscode.workspace.findFiles(this.buildPropertiesRelativePattern);

    if (files.length <= 0) {
      return;
    }
    try {
      current = await readFileAsync(files[0].fsPath);
    } catch (error) {

    }

    if (current !== undefined) {
      // Load and parse file
      const parsed: IEditorConfig = jsonc.parse(current);
      this.loadNewFile(parsed);
    }
  }

  private loadNewFile(contents: IEditorConfig) {
    const currentKey = this.getSelectedComponent(contents.components);
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
    const sysroot = this.lastConfig.compiler.sysroot;
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

  public getLastConfig(): ExternalEditorConfig | undefined {
    const component = this.getSelectedComponent(this.lastConfig.components);
    if (component === undefined) {
      return undefined;
    }
    return {
      compiler: this.lastConfig.compiler,
      component: this.lastConfig.components[component]
    };
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
