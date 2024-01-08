'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { localize as i18n } from '../locale';
import { generateCopyCpp, generateCopyJava, setDesktopEnabled } from '../shared/generator';
import { ImportUpdate } from '../shared/importupdater';
import { IPreferencesJson } from '../shared/preferencesjson';
import { existsAsync, extensionContext, mkdirpAsync, promptForProjectOpen, readFileAsync, writeFileAsync } from '../utilities';
import { IGradle2020IPCData, IGradle2020IPCReceive, IGradle2020IPCSend } from './pages/gradle2020importpagetypes';
import { WebViewBase } from './webviewbase';

export class Gradle2020Import extends WebViewBase {
  public static async Create(resourceRoot: string): Promise<Gradle2020Import> {
    const cimport = new Gradle2020Import(resourceRoot);
    await cimport.asyncInitialize();
    return cimport;
  }

  private onLoad?: () => Promise<void>;

  private constructor(resourceRoot: string) {
    super('wpilibgradle2020import', 'WPILib Gradle 2020-2023 Import', resourceRoot);

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.importGradle2020Project', () => {
      return this.startWebpage();
    }));
  }

  public async startWithProject(projectRoot: vscode.Uri) {
    await this.startWebpage();
    const project = vscode.Uri.file(path.join(projectRoot.fsPath, 'build.gradle'));
    return this.handleProject(project, true);
  }

  private async startWebpage() {
    this.displayWebView(vscode.ViewColumn.Active, true, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });
    if (this.webview) {
      this.webview.webview.onDidReceiveMessage(async (data: IGradle2020IPCReceive) => {
        switch (data.type) {
          case 'loaded':
            const copy = this.onLoad;
            this.onLoad = undefined;
            if (copy) {
              await copy();
            }
            break;
          case 'gradle2020':
            await this.handleGradle2020Button();
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
  }

  private async postMessage(data: IGradle2020IPCSend): Promise<boolean> {
    if (this.webview) {
      return this.webview.webview.postMessage(data);
    } else {
      return false;
    }
  }

  private async handleProject(oldProject: vscode.Uri, occursBeforeLoad: boolean) {
    const oldProjectPath = path.dirname(oldProject.fsPath);

    const wpilibJsonFile = path.join(oldProjectPath, '.wpilib', 'wpilib_preferences.json');

    let teamNumber: string | undefined;

    if (await existsAsync(wpilibJsonFile)) {
      const wpilibJsonFileContents = await readFileAsync(wpilibJsonFile, 'utf8');
      const wpilibJsonFileParsed = JSON.parse(wpilibJsonFileContents) as IPreferencesJson;
      teamNumber = wpilibJsonFileParsed.teamNumber.toString(10);
    }

    this.onLoad = async () => {
      await this.postMessage({
        data: oldProject.fsPath,
        type: 'gradle2020',
      });
      await this.postMessage({
        data: path.dirname(path.dirname(oldProject.fsPath)),
        type: 'newproject',
      });
      await this.postMessage({
        data: path.basename(oldProjectPath) + '-Imported',
        type: 'projectname',
      });
      if (teamNumber !== undefined) {
        await this.postMessage({
          data: teamNumber,
          type: 'teamnumber',
        });
      }
    };

    if (!occursBeforeLoad) {
      const copy = this.onLoad;
      this.onLoad = undefined;
      await copy();
    }
  }

  private async handleGradle2020Button() {
    // Find old project
    const oldProject = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Documents')),
      filters: {
        'Gradle 2020 Project': ['gradle'],
      },
      openLabel: 'Select a Project',
    });

    if (oldProject === undefined || oldProject.length !== 1) {
      return;
    }

    return this.handleProject(oldProject[0], false);
  }

  private async handleNewProjectLoc() {
    const open: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Documents')),
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

  private async handleImport(data: IGradle2020IPCData) {
    if (!path.isAbsolute(data.toFolder)) {
      vscode.window.showErrorMessage('Can only extract to absolute path');
      return;
    }
    const oldProjectPath = path.dirname(data.fromProps);

    // Detect C++ or Java project
    const wpilibJsonFile = path.join(oldProjectPath, '.wpilib', 'wpilib_preferences.json');

    let cpp = true;

    if (await existsAsync(wpilibJsonFile)) {
      const wpilibJsonFileContents = await readFileAsync(wpilibJsonFile, 'utf8');
      const wpilibJsonFileParsed = JSON.parse(wpilibJsonFileContents) as IPreferencesJson;
      if (wpilibJsonFileParsed.currentLanguage === 'cpp') {
        cpp = true;
      } else if (wpilibJsonFileParsed.currentLanguage === 'java') {
        cpp = false;
      } else {
        await vscode.window.showErrorMessage(i18n('message', 'Failed to detect project type. Did you select the build.gradle file of a wpilib project?'), {
          modal: true,
        });
        return;
      }
    } else {
      // Error
      await vscode.window.showErrorMessage(i18n('message', 'Failed to detect project type. Did you select the build.gradle file of a wpilib project?'), {
        modal: true,
      });
      return;
    }

    const gradleFile = path.join(oldProjectPath, 'build.gradle');

    let javaRobotPackage: string = '';

    if (await existsAsync(gradleFile) && !cpp) {
      const gradleContents = await readFileAsync(gradleFile, 'utf8');
      const mainClassRegex = 'def ROBOT_MAIN_CLASS = "(.+)"';
      const regexRes = new RegExp(mainClassRegex, 'g').exec(gradleContents);
      if (regexRes !== null && regexRes.length === 2) {
        javaRobotPackage = regexRes[1];
      } else {
        const res = await vscode.window.showInformationMessage(i18n('message', 'Failed to determine robot class. Enter it manually?'), {
          modal: true,
        }, {title: 'Yes'}, {title: 'No', isCloseAffordance: true});
        if (res?.title !== 'Yes') {
          await vscode.window.showErrorMessage('Project Import Failed');
          return;
        }
      }
    } else if (!cpp) {
      const res = await vscode.window.showInformationMessage(i18n('message', 'Failed to determine robot class. Enter it manually?'), {
        modal: true,
      }, {title: 'Yes'}, {title: 'No', isCloseAffordance: true});
      if (res?.title !== 'Yes') {
        await vscode.window.showErrorMessage('Project Import Failed');
        return;
      }
    }

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
    const resourceRoot = path.join(extensionContext.extensionPath, 'resources');
    const commandsJsonPath = path.join(oldProjectPath, 'vendordeps', 'WPILibOldCommands.json');

    if (fs.existsSync(commandsJsonPath)) {
      await vscode.window.showErrorMessage(i18n('message', 'WPILib no longer supports the Old Command Framework. The Old Command Vendordep has not been imported. Please update to the New Command Framework'), {
        modal: true,
      });
    }

    let success = false;
    if (cpp) {
      const gradlePath = path.join(gradleBasePath, data.romi ? 'cppromi' : 'cpp');
      success = await generateCopyCpp(path.join(resourceRoot, 'cpp'), path.join(oldProjectPath, 'src'), undefined, gradlePath, toFolder,
                                       true, []);
    } else {
      const gradlePath = path.join(gradleBasePath, data.romi ? 'javaromi' : 'java');
      success = await generateCopyJava(path.join(resourceRoot, 'java'), path.join(oldProjectPath, 'src'), undefined, gradlePath, toFolder,
                                       javaRobotPackage, '', true, []);
    }

    if (!success) {
      vscode.window.showErrorMessage(i18n('message', 'Failed to update. Did you attempt to extract to the existing project folder?'), {
        modal: true,
      });
      return;
    }

    if (data.desktop) {
      const buildgradle = path.join(toFolder, 'build.gradle');

      await setDesktopEnabled(buildgradle, true);
    }

    const jsonFilePath = path.join(toFolder, '.wpilib', 'wpilib_preferences.json');

    const parsed = JSON.parse(await readFileAsync(jsonFilePath, 'utf8')) as IPreferencesJson;
    parsed.teamNumber = parseInt(data.teamNumber, 10);
    await writeFileAsync(jsonFilePath, JSON.stringify(parsed, null, 4));

    let replacementFile = path.join(resourceRoot, 'java_replacements.json');
    if (cpp) {
      replacementFile = path.join(resourceRoot, 'cpp_replacements.json');
    }
    await ImportUpdate(toFolder, replacementFile);

    await promptForProjectOpen(vscode.Uri.file(toFolder));
  }

  private async asyncInitialize() {
    await this.loadWebpage(path.join(extensionContext.extensionPath, 'resources', 'webviews', 'gradle2020import.html'),
      path.join(extensionContext.extensionPath, 'resources', 'dist', 'gradle2020importpage.js'));
  }
}
