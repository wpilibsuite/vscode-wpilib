'use strict';

import * as electron from 'electron';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as ncp from 'ncp';
import * as path from 'path';
import * as temp from 'temp';
import * as util from 'util';
import * as vscode from './vscodeshim';

const dialog = electron.remote.dialog;

export function getIsWindows(): boolean {
  const nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}

export const existsAsync = util.promisify(fs.exists);

export const deleteFileAsync = util.promisify(fs.unlink);

export const readFileAsync = util.promisify(fs.readFile);

export const writeFileAsync = util.promisify(fs.writeFile);

export const readdirAsync = util.promisify(fs.readdir);

export const mkdirpAsync = util.promisify(mkdirp);

export function ncpAsync(source: string, dest: string, options: ncp.Options = {}): Promise<void> {
  return mkdirpAsync(dest).then(() => {
    return new Promise<void>((resolve, reject) => {
      ncp.ncp(source, dest, options, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

class ExtensionContext implements vscode.ExtensionContext {
  public storagePath: string | undefined;

  public constructor() {
    temp.track();
    this.storagePath = temp.mkdirSync();
  }
}

export const extensionContext: vscode.ExtensionContext = new ExtensionContext();

export async function promptForProjectOpen(toFolder: vscode.Uri): Promise<boolean> {
  const r = await dialog.showMessageBox({
    buttons: ['Open Folder', 'OK'],
    message: 'Creation of project complete: ' + toFolder.fsPath,
    noLink: true,
  });
  if (r.response === 0) {
    console.log(toFolder);
    electron.shell.showItemInFolder(path.join(toFolder.fsPath, 'build.gradle'));
  }
  console.log(r);
  return true;
}
