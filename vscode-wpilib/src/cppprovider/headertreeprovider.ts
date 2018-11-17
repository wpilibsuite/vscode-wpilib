'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
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

// tslint:disable-next-line:interface-name
interface Entry {
  uri: vscode.Uri;
  type: vscode.FileType;
}

//#endregion

export class HeaderTreeProvider implements vscode.TreeDataProvider<Entry> {

  private libRoots: string[] = [];

  private _onDidChangeFile: vscode.EventEmitter<Entry | undefined | null>;

  constructor() {
    this._onDidChangeFile = new vscode.EventEmitter<Entry | undefined | null>();
  }

  get onDidChangeTreeData(): vscode.Event<Entry | undefined | null> {
    return this._onDidChangeFile.event;
  }

  public updateToolChains(toolchains: IToolChain) {
    this.libRoots = [];
    for (const l of toolchains.allLibFiles) {
      if (l.indexOf('-sources.zip') === -1) {
        this.libRoots.push(l);
      }
    }
    this._onDidChangeFile.fire(undefined);
  }

  public async getChildren(element?: Entry): Promise<Entry[]> {

    if (element) {
      const dirChildren = await this.readDirectory(element.uri);
      dirChildren.sort((a, b) => {
        if (a[1] === b[1]) {
          return a[0].localeCompare(b[0]);
        }
        return a[1] === vscode.FileType.Directory ? -1 : 1;
      });
      return dirChildren.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(element.uri.fsPath, name)), type }));
    }

    const entries: Entry[] = [];

    const children = [];

    for (const root of this.libRoots) {
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
  }

  public getTreeItem(element: Entry): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed :
        vscode.TreeItemCollapsibleState.None);
    if (element.type === vscode.FileType.File) {
      treeItem.command = { command: 'fileExplorer.openFile', title: 'Open File', arguments: [element.uri] };
      treeItem.contextValue = 'file';
    }
    return treeItem;
  }

  private async _stat(pth: string): Promise<vscode.FileStat> {
    return new FileStat(await stat(pth));
  }

  private readDirectory(uri: vscode.Uri): Array<[string, vscode.FileType]> | Thenable<Array<[string, vscode.FileType]>> {
    return this._readDirectory(uri);
  }

  private async _readDirectory(uri: vscode.Uri): Promise<Array<[string, vscode.FileType]>> {
    const children = await readdir(uri.fsPath);

    const result: Array<[string, vscode.FileType]> = [];
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

  constructor() {
    this.treeDataProvider = new HeaderTreeProvider();
    this.fileExplorer = vscode.window.createTreeView('cppHeaders', { treeDataProvider: this.treeDataProvider });
    vscode.commands.registerCommand('fileExplorer.openFile', (resource) => this.openResource(resource));
  }

  public updateToolChains(toolchains: IToolChain) {
    this.treeDataProvider.updateToolChains(toolchains);
  }

  public dispose() {
    this.fileExplorer.dispose();
  }

  private openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }
}
