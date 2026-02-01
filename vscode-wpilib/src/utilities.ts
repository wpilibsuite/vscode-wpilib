'use strict';
import * as fs from 'fs';
import { mkdirp } from 'mkdirp';
import * as ncp from 'ncp';
import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { IExecuteAPI, IPreferences } from 'vscode-wpilibapi';
import { localize as i18n } from './locale';
import { setExecutePermissions } from './shared/permissions';

// General utilites usable by multiple classes

export function getIsWindows(): boolean {
  const nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}

export function getIsMac(): boolean {
  const nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'darwin';
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

export const statAsync = util.promisify(fs.stat);

export const readFileAsync = util.promisify(fs.readFile);

export const writeFileAsync = util.promisify(fs.writeFile);

export const copyFileAsync = util.promisify(fs.copyFile);

export const mkdirAsync = util.promisify(fs.mkdir);

// fs.exists is deprecated, use fs.access instead
export async function existsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const deleteFileAsync = util.promisify(fs.unlink);

export const mkdirpAsync = mkdirp;

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

export const readdirAsync = util.promisify(fs.readdir);

export let javaHome: string | undefined;
export function setJavaHome(jhome: string): void {
  javaHome = jhome;
}

export async function gradleRun(
  args: string,
  rootDir: string,
  workspace: vscode.WorkspaceFolder,
  name: string,
  executeApi: IExecuteAPI,
  preferences: IPreferences
): Promise<number> {
  let command = './gradlew ' + args + ' ' + preferences.getAdditionalGradleArguments();
  if (preferences.getOffline()) {
    command += ' --offline';
  }

  let varCommands;

  if (javaHome !== undefined && javaHome !== '') {
    command += ` -Dorg.gradle.java.home="${javaHome}"`;
    varCommands = {
      ['JAVA_HOME']: javaHome,
    };
  }

  await setExecutePermissions(path.join(workspace.uri.fsPath, 'gradlew'));
  return executeApi.executeCommand(command, name, rootDir, workspace, varCommands);
}

export let extensionContext: vscode.ExtensionContext;
export function setExtensionContext(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

export function getDesktopEnabled(buildgradle: string): Promise<boolean | undefined> {
  return new Promise<boolean | undefined>((resolve) => {
    fs.readFile(buildgradle, 'utf8', (err, dataIn) => {
      if (err) {
        resolve(undefined);
      } else {
        const dataOut = dataIn.match(/def\s+includeDesktopSupport\s*=\s*(true|false)/m);
        if (dataOut === null) {
          resolve(undefined);
        } else {
          resolve(dataOut[1] === 'true');
        }
      }
    });
  });
}

export async function promptForProjectOpen(toFolder: vscode.Uri): Promise<boolean> {
  const openSelection = await vscode.window.showInformationMessage(
    i18n('message', 'Project successfully created. Would you like to open the folder?'),
    {
      modal: true,
    },
    { title: i18n('ui', 'Yes (Current Window)') },
    { title: i18n('ui', 'Yes (New Window)') },
    { title: i18n('ui', 'No'), isCloseAffordance: true }
  );
  if (openSelection === undefined) {
    return true;
  } else if (openSelection.title === i18n('ui', 'Yes (Current Window)')) {
    await vscode.commands.executeCommand('vscode.openFolder', toFolder, false);
  } else if (openSelection.title === i18n('ui', 'Yes (New Window)')) {
    await vscode.commands.executeCommand('vscode.openFolder', toFolder, true);
  } else {
    return true;
  }
  return true;
}
