'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../logger';
import { IEnabledBuildTypes } from './apiprovider';
import { IToolChain } from './jsonformats';

//#region Utilities

function handleResult<T>(resolve: (result: T) => void, reject: (error: Error) => void, error: Error | null | undefined, result: T): void {
  if (error) {
    reject(massageError(error));
  } else {
    resolve(result);
  }
}

function massageError(error: Error & { code?: string }): Error {
  if (error.code === 'ENOENT') {
    return vscode.FileSystemError.FileNotFound();
  }

  if (error.code === 'EISDIR') {
    return vscode.FileSystemError.FileIsADirectory();
  }

  if (error.code === 'EEXIST') {
    return vscode.FileSystemError.FileExists();
  }

  if (error.code === 'EPERM' || error.code === 'EACCESS') {
    return vscode.FileSystemError.NoPermissions();
  }

  return error;
}

function normalizeNFC(items: string): string;
function normalizeNFC(items: string[]): string[];
function normalizeNFC(items: string | string[]): string | string[] {
  if (process.platform !== 'darwin') {
    return items;
  }

  if (Array.isArray(items)) {
    return items.map((item) => item.normalize('NFC'));
  }

  return items.normalize('NFC');
}

function readdir(pth: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(pth, (error, children) => handleResult(resolve, reject, error, normalizeNFC(children)));
  });
}

function stat(pth: string): Promise<fs.Stats> {
  return new Promise<fs.Stats>((resolve, reject) => {
    fs.stat(pth, (error, st) => handleResult(resolve, reject, error, st));
  });
}

export class FileStat implements vscode.FileStat {

  constructor(private fsStat: fs.Stats) { }

  get type(): vscode.FileType {
    return this.fsStat.isFile() ? vscode.FileType.File : this.fsStat.isDirectory() ? vscode.FileType.Directory :
      this.fsStat.isSymbolicLink() ? vscode.FileType.SymbolicLink : vscode.FileType.Unknown;
  }

  get isFile(): boolean | undefined {
    return this.fsStat.isFile();
  }

  get isDirectory(): boolean | undefined {
    return this.fsStat.isDirectory();
  }

  get isSymbolicLink(): boolean | undefined {
    return this.fsStat.isSymbolicLink();
  }

  get size(): number {
    return this.fsStat.size;
  }

  get ctime(): number {
    return this.fsStat.ctime.getTime();
  }

  get mtime(): number {
    return this.fsStat.mtime.getTime();
  }
}

interface Entry {
  uri: vscode.Uri;
  type: vscode.FileType;
  binaryName?: string;
  binaryFiles?: string[];
}

//#endregion

export class HeaderTreeProvider implements vscode.TreeDataProvider<Entry> {

  private toolchains: IToolChain | undefined;
  private enabledBuildTypes: IEnabledBuildTypes | undefined;

  private _onDidChangeFile: vscode.EventEmitter<Entry | undefined | null>;

  private wpilibIcon: vscode.Uri;

  constructor(resourceRoot: string) {
    this.wpilibIcon = vscode.Uri.file(path.join(resourceRoot, 'wpilib.svg'));
    this._onDidChangeFile = new vscode.EventEmitter<Entry | undefined | null>();
  }

  get onDidChangeTreeData(): vscode.Event<Entry | undefined | null> {
    return this._onDidChangeFile.event;
  }

  public updateToolChains(toolchains: IToolChain, enables: IEnabledBuildTypes) {
    this.toolchains = toolchains;
    this.enabledBuildTypes = enables;
    this._onDidChangeFile.fire(undefined);
  }

  public getChildren(element?: Entry): Promise<Entry[]> {
    if (element) {
      return this.getChildrenElement(element);
    } else {
      return this.getChildrenRoot();
    }
  }

  public getTreeItem(element: Entry): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed :
        vscode.TreeItemCollapsibleState.None);
    if (element.type === vscode.FileType.File) {
      treeItem.command = { command: 'fileExplorer.openFile', title: 'Open File', arguments: [element.uri] };
      treeItem.contextValue = 'file';
    }
    if (element.binaryName !== undefined) {
      treeItem.label = element.binaryName;
      treeItem.iconPath = this.wpilibIcon;
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }
    return treeItem;
  }

  private async getChildrenElement(element: Entry): Promise<Entry[]> {
    if (element.binaryFiles !== undefined) {
      // Root
      const entries: Entry[] = [];

      const children = [];

      for (const root of element.binaryFiles) {
        const dirRead = await this.readDirectory(vscode.Uri.file(root));
        for (const d of dirRead) {
          if (root.indexOf('wpilibc-cpp-') === -1) {
            children.push({dir: d, root});
          } else {
            // TODO: Remove shim headers
            children.push({dir: d, root});
          }
        }
      }

      children.sort((a, b) => {
        if (a.dir[1] === b.dir[1]) {
          return a.dir[0].localeCompare(b.dir[0]);
        }
        return a.dir[1] === vscode.FileType.Directory ? -1 : 1;
      });
      entries.push(...children.map(({dir, root}) => ({ uri: vscode.Uri.file(path.join(root, dir[0])), type: dir[1] })));

      return entries;
    } else {
      // Dir
      const dirChildren = await this.readDirectory(element.uri);
      dirChildren.sort((a, b) => {
        if (a[1] === b[1]) {
          return a[0].localeCompare(b[0]);
        }
        return a[1] === vscode.FileType.Directory ? -1 : 1;
      });
      return dirChildren.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(element.uri.fsPath, name)), type }));
    }
  }

  private async getChildrenRoot(): Promise<Entry[]>  {
    const entries: Entry[] = [];

    if (this.toolchains === undefined) {
      return entries;
    }

    const currentBinaryTypes = this.enabledBuildTypes;

    for (const bin of this.toolchains.binaries) {
      if (currentBinaryTypes !== undefined) {
        if (bin.executable === true && currentBinaryTypes.executables === false) {
          continue;
        }

        if (bin.sharedLibrary === true && currentBinaryTypes.sharedLibraries === false) {
          continue;
        }

        if (bin.executable === false && bin.sharedLibrary === false && currentBinaryTypes.staticLibraries === false) {
          continue;
        }
      }

      let exeType = '';
      if (bin.executable === true) {
        exeType = ' (Exe)';
      } else if (bin.sharedLibrary === true) {
        exeType = ' (Shared)';
      } else if (bin.sharedLibrary !== undefined && bin.executable !== undefined) {
        exeType = ' (Static)';
      }

      entries.push({binaryFiles: bin.libHeaders, binaryName: bin.componentName + ` ${exeType}`, type: vscode.FileType.Unknown,
                    uri: vscode.Uri.file(bin.componentName)});
    }

    entries.push({binaryFiles: this.toolchains.allLibFiles, binaryName: 'All Files',
                  type: vscode.FileType.Unknown, uri: vscode.Uri.file('all')});

    return entries;
  }

  private async _stat(pth: string): Promise<vscode.FileStat> {
    return new FileStat(await stat(pth));
  }

  private readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return this._readDirectory(uri);
  }

  private async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    let children: string[] = [];
    try {
      children = await readdir(uri.fsPath);
    } catch (err) {
      logger.log('Directory Warning', err);
    }

    const result: [string, vscode.FileType][] = [];
    for (const child of children) {
      const st = await this._stat(path.join(uri.fsPath, child));
      result.push([child, st.type]);
    }

    return Promise.resolve(result);
  }
}
export class HeaderExplorer {
  private fileExplorer: vscode.TreeView<Entry>;
  private treeDataProvider: HeaderTreeProvider;

  constructor(resourceRoot: string) {
    this.treeDataProvider = new HeaderTreeProvider(resourceRoot);
    this.fileExplorer = vscode.window.createTreeView('cppDependencies', { treeDataProvider: this.treeDataProvider });
    vscode.commands.registerCommand('fileExplorer.openFile', (resource: vscode.Uri) => this.openResource(resource));
  }

  public updateToolChains(toolchains: IToolChain, enables: IEnabledBuildTypes) {
    this.treeDataProvider.updateToolChains(toolchains, enables);
  }

  public dispose() {
    this.fileExplorer.dispose();
  }

  private openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }
}
