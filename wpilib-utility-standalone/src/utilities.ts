'use strict';

import * as fs from 'fs';
import * as temp from 'temp';
import * as vscode from './vscodeshim';

export function getIsWindows(): boolean {
  const nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}

export function promisifyExists(filename: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    fs.exists(filename, (e) => {
      resolve(e);
    });
  });
}

export function promisifyWriteFile(filename: string, contents: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(filename, contents, 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function promisifyReadFile(filename: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export function promisifyDeleteFile(file: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    fs.unlink(file, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
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

export async function promptForProjectOpen(_toFolder: vscode.Uri): Promise<boolean> {
  return true;
}
