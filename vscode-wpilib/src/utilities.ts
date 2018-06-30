'use strict';
import * as fs from 'fs';
import * as path from 'path';
import * as timers from 'timers';
import * as vscode from 'vscode';
import { IExecuteAPI } from './shared/externalapi';
import { setExecutePermissions } from './shared/permissions';

export function getIsWindows(): boolean {
  const nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}

export async function getClassName(): Promise<string | undefined> {
  const promptString = 'Please enter a class name';
  const className = await vscode.window.showInputBox({
    prompt: promptString,
    validateInput: (s) => {
      const match = s.match('^([a-zA-Z_]{1}[a-zA-Z0-9_]*)$');
      if (match === null || match.length === 0) {
        return 'Invalid Classname';
      }
      return undefined;
    },
  });
  return className;
}

export async function getPackageName(): Promise<string | undefined> {
  const promptString = 'Please enter a package name';
  const packageName = await vscode.window.showInputBox({
    prompt: promptString,
    validateInput: (s) => {
      const match = s.match('^([a-zA-Z_]{1}[a-zA-Z0-9_]*(\\.[a-zA-Z_]{1}[a-zA-Z0-9_]*)*)$');

      if (match === null || match.length === 0) {
        return 'Invalid Package Name';
      }

      return undefined;
    },
  });
  return packageName;
}

export function readFileAsync(file: string): Promise<string> {
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

export function promisifyMkDir(dirName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.mkdir(dirName, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function promisifyTimer(time: number): Promise<void> {
  return new Promise<void>((resolve, _) => {
    timers.setTimeout(() => {
      resolve();
    }, time);
  });
}

export async function gradleRun(args: string, rootDir: string, workspace: vscode.WorkspaceFolder,
                                online: boolean, name: string, executeApi: IExecuteAPI): Promise<number> {
  let command = './gradlew ' + args;
  if (!online) {
    command += ' --offline';
  }

  await setExecutePermissions(path.join(workspace.uri.fsPath, 'gradlew'));
  return executeApi.executeCommand(command, name, rootDir, workspace);
}
