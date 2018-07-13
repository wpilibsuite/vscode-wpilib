'use strict';

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { generateCopyCpp, generateCopyJava } from './shared/generator';
import { promisifyExists } from './utilities';

// tslint:disable-next-line:no-var-requires
const properties = require('properties');

// tslint:disable-next-line:no-any
function promisifyProperties(file: string): Promise<any> {
  // tslint:disable-next-line:no-any
  return new Promise<any>((resolve, reject) => {
    // tslint:disable-next-line:no-any no-unsafe-any
    properties.parse(file, { path: true, variables: true}, (err: any, obj: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(obj);
      }
    });
  });
}

export class EclipseUpgrade {
  private readonly gradleBasePath: string;

  public constructor(resourceRoot: string) {
    vscode.commands.registerCommand('wpilibcore.upgradeEclipseProject', async () => {
      const success = await this.upgradeProject();
      if (success) {
        const openSelection = await vscode.window.showInformationMessage('Would you like to open the folder?',
                                                                         'Yes (Current Window)', 'Yes (New Window)', 'No');
        if (openSelection === undefined) {
          return;
        } else if (openSelection === 'Yes (Current Window)') {
          await vscode.commands.executeCommand('vscode.openFolder', success, false);
        } else if (openSelection === 'Yes (New Window)') {
          await vscode.commands.executeCommand('vscode.openFolder', success, true);
        } else {
          return;
        }
      }
    });
    this.gradleBasePath = path.join(resourceRoot, 'gradle');
  }

  public async upgradeProject(): Promise<vscode.Uri | undefined> {
    // Find old project
    const oldProject = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'eclipse-workspace')),
      filters: {
        'Eclipse Project': ['project'],
      },
      openLabel: 'Select a Project',
    });

    if (oldProject === undefined || oldProject.length !== 1) {
      await vscode.window.showInformationMessage('Invalid selection. Cancelling');
      return undefined;
    }

    const oldProjectPath =  path.dirname(oldProject[0].fsPath);

    const cpp = await promisifyExists(path.join(oldProjectPath, '.cproject'));

    console.log(cpp);

    const props = await promisifyProperties(path.join(oldProjectPath, 'build.properties'));

    let javaRobotClass = '';

    // tslint:disable-next-line:no-unsafe-any
    if ('robot.class' in props) {
      // tslint:disable-next-line:no-unsafe-any
      javaRobotClass = props['robot.class'];
    }

    // Ask user for a folder
    const open: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Folder',
    };
    const result = await vscode.window.showOpenDialog(open);

    if (result === undefined) {
      await vscode.window.showInformationMessage('Invalid selection. Cancelling');
      return undefined;
    }

    if (cpp) {
      const gradlePath = path.join(this.gradleBasePath, 'cpp');
      await generateCopyCpp(path.join(oldProjectPath, 'src'), gradlePath, result[0].fsPath, true);
    } else {
      const gradlePath = path.join(this.gradleBasePath, 'java');
      await generateCopyJava(path.join(oldProjectPath, 'src'), gradlePath, result[0].fsPath, javaRobotClass, '');
    }

    return result[0];
  }

  // tslint:disable-next-line:no-empty
  public dispose() {
  }
}
