'use strict';
import * as vscode from 'vscode';


export function getIsWindows(): boolean {
  const nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}

export async function getClassName(): Promise<string | undefined> {
  let count = 0;
  let promptString = 'Please enter a class name';
  while (count < 3) {
    count++;
    const className = await vscode.window.showInputBox({
      prompt: promptString
    });

    if (className === undefined || className === '') {
      vscode.window.showInformationMessage('Class entering cancelled');
      return undefined;
    }

    const match = className.match('^([a-zA-Z_]{1}[a-zA-Z0-9_]*)$');

    if (match === null || match.length === 0) {
      promptString = 'Invalid Classname. Please enter a valid classname';
      continue;
    }

    return className;
  }
  await vscode.window.showErrorMessage('Too many invalid class names entered');
  return undefined;
}

export async function getPackageName(): Promise<string | undefined> {
  let count = 0;
  let promptString = 'Please enter a package name';
  while (count < 3) {
    count++;
    const packageName = await vscode.window.showInputBox({
      prompt: promptString
    });

    if (packageName === undefined || packageName === '') {
      vscode.window.showInformationMessage('Package entering cancelled');
      return undefined;
    }

    const match = packageName.match('^([a-zA-Z_]{1}[a-zA-Z0-9_]*(\\.[a-zA-Z_]{1}[a-zA-Z0-9_]*)*)$');

    if (match === null || match.length === 0) {
      promptString = 'Invalid Package name. Please enter a valid pacakge name.';
      continue;
    }

    return packageName;
  }
  await vscode.window.showErrorMessage('Too many invalid package names entered');
  return undefined;
}
