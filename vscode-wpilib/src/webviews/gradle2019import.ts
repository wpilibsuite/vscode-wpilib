'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { generateCopyCpp, generateCopyJava, setDesktopEnabled } from '../shared/generator';
import { IPreferencesJson } from '../shared/preferencesjson';
import { existsAsync, extensionContext, mkdirpAsync, promptForProjectOpen, readFileAsync, writeFileAsync } from '../utilities';
import { IGradle2019IPCData, IGradle2019IPCReceive, IGradle2019IPCSend } from './pages/gradle2019importpagetypes';
import { WebViewBase } from './webviewbase';

export class Gradle2019Import extends WebViewBase {
  public static async Create(resourceRoot: string): Promise<Gradle2019Import> {
    const cimport = new Gradle2019Import(resourceRoot);
    await cimport.asyncInitialize();
    return cimport;
  }

  private constructor(resourceRoot: string) {
    super('wpilibgradle2019import', 'WPILib Gradle2019 Import', resourceRoot);

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.importGradle2019Project', async () => {
      this.displayWebView(vscode.ViewColumn.Active, true, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      if (this.webview) {
        this.webview.webview.onDidReceiveMessage(async (data: IGradle2019IPCReceive) => {
          switch (data.type) {
            case 'gradle2019':
              await this.handleGradle2019Button();
              break;
            case 'newproject':
              await this.handleNewProjectLoc();
              break;
            case 'importproject':
              if (data.data) {
                await this.handleImport(data.data);
              }
              break;
            default:
              break;
          }
        }, undefined, this.disposables);
      }
    }));
  }

  private async postMessage(data: IGradle2019IPCSend): Promise<boolean> {
    if (this.webview) {
      return this.webview.webview.postMessage(data);
    } else {
      return false;
    }
  }

  private async handleGradle2019Button() {
    // Find old project
    const oldProject = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Documents')),
      filters: {
        'Gradle 2019 Project': ['gradle'],
      },
      openLabel: 'Select a Project',
    });

    if (oldProject === undefined || oldProject.length !== 1) {
      return;
    }

    const oldProjectPath = path.dirname(oldProject[0].fsPath);
    if (this.webview) {
      await this.postMessage({
        data: oldProject[0].fsPath,
        type: 'gradle2019',
      });
      await this.postMessage({
        data: path.basename(oldProjectPath),
        type: 'projectname',
      });
    }
  }

  private async handleNewProjectLoc() {
    const open: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Folder',
    };
    const result = await vscode.window.showOpenDialog(open);

    if (result === undefined) {
      return;
    }

    if (this.webview) {
      await this.postMessage({
        data: result[0].fsPath,
        type: 'newproject',
      });
    }
  }

  private async handleImport(data: IGradle2019IPCData) {
    if (!path.isAbsolute(data.toFolder)) {
      vscode.window.showErrorMessage('Can only extract to absolute path');
      return;
    }
    const oldProjectPath = path.dirname(data.fromProps);

    // TODO: This is where the update occurs

    const cpp = await existsAsync(path.join(oldProjectPath, '.cproject'));

    const javaRobotPackage: string = '';

    let toFolder = data.toFolder;

    if (data.newFolder) {
      toFolder = path.join(data.toFolder, data.projectName);
    }

    try {
      await mkdirpAsync(toFolder);
    } catch {
      //
    }

    const gradleBasePath = path.join(extensionContext.extensionPath, 'resources', 'gradle');

    let success = false;
    if (cpp) {
      const gradlePath = path.join(gradleBasePath, 'cpp');
      success = await generateCopyCpp(path.join(oldProjectPath, 'src'), gradlePath, toFolder, true);
    } else {
      const gradlePath = path.join(gradleBasePath, 'java');
      success = await generateCopyJava(path.join(oldProjectPath, 'src'), gradlePath, toFolder, javaRobotPackage + '.Main', '');
    }

    if (!success) {
      return;
    }

    const buildgradle = path.join(toFolder, 'build.gradle');

    await new Promise<void>((resolve, reject) => {
      fs.readFile(buildgradle, 'utf8', (err, dataIn) => {
        if (err) {
          resolve();
        } else {
          const dataOut = dataIn.replace(new RegExp('def includeSrcInIncludeRoot = false', 'g'), 'def includeSrcInIncludeRoot = true');
          fs.writeFile(buildgradle, dataOut, 'utf8', (err1) => {
            if (err1) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });

    await setDesktopEnabled(buildgradle, true);

    const jsonFilePath = path.join(toFolder, '.wpilib', 'wpilib_preferences.json');

    const parsed = JSON.parse(await readFileAsync(jsonFilePath, 'utf8')) as IPreferencesJson;
    parsed.teamNumber = parseInt(data.teamNumber, 10);
    await writeFileAsync(jsonFilePath, JSON.stringify(parsed, null, 4));

    await promptForProjectOpen(vscode.Uri.file(toFolder));
  }

  private async asyncInitialize() {
    await this.loadWebpage(path.join(extensionContext.extensionPath, 'resources', 'webviews', 'gradle2019import.html'),
      path.join(extensionContext.extensionPath, 'resources', 'dist', 'gradle2019importpage.js'));
  }
}
