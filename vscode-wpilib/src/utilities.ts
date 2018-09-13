'use strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as timers from 'timers';
import * as vscode from 'vscode';
import { IExecuteAPI, IPreferences } from 'vscode-wpilibapi';
import { setExecutePermissions } from './shared/permissions';

// General utilites usable by multiple classes

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

export let javaHome: string;
export function setJavaHome(jhome: string): void {
  javaHome = jhome;
}

export async function gradleRun(args: string, rootDir: string, workspace: vscode.WorkspaceFolder,
                                name: string, executeApi: IExecuteAPI, preferences: IPreferences): Promise<number> {
  let command = './gradlew ' + args + ' ' + preferences.getAdditionalGradleArguments();
  if (!preferences.getOnline()) {
    command += ' --offline';
  }

  if (javaHome !== '') {
    command += ` -Dorg.gradle.java.home="${javaHome}"`;
  }

  await setExecutePermissions(path.join(workspace.uri.fsPath, 'gradlew'));
  return executeApi.executeCommand(command, name, rootDir, workspace);
}

export let extensionContext: vscode.ExtensionContext;
export function setExtensionContext(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

export function getHomeDir(year: string): string {
  const frcHome = process.env[`FRC_${year}_HOME`];
  if (frcHome) {
    return frcHome;
  } else {
    if (getIsWindows()) {
      // Windows, search public home
      return '';
    } else {
      // Unix, search user home
      const dir = os.homedir();
      const wpilibhome = path.join(dir, `wpilib${year}`);
      return wpilibhome;
    }
  }
}
