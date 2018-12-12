'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExampleTemplateAPI } from '../exampletemplateapi';
import { IPreferencesJson } from '../preferences';
import { generateCopyCpp, generateCopyJava, promisifyMkdirp } from '../shared/generator';
import { extensionContext, promisifyExists, promisifyReadFile, promisifyWriteFile, setDesktopEnabled } from '../utilities';
import { IEclipseIPCData, IEclipseIPCReceive, IEclipseIPCSend } from './pages/eclipseimportpagetypes';
import { WebViewBase } from './webviewbase';

// tslint:disable-next-line:no-var-requires
const javaProperties = require('java-properties');

export class EclipseImport extends WebViewBase {
  public static async Create(resourceRoot: string): Promise<EclipseImport> {
    const cimport = new EclipseImport(resourceRoot);
    await cimport.asyncInitialize();
    return cimport;
  }

  private constructor(resourceRoot: string) {
    super('wpilibeclipseimport', 'WPILib Eclipse Import', resourceRoot);

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.importEclipseProject', async () => {
      this.displayWebView(vscode.ViewColumn.Active, true, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      if (this.webview) {
        this.webview.webview.onDidReceiveMessage(async (data: IEclipseIPCReceive) => {
          switch (data.type) {
            case 'eclipse':
              await this.handleEclipseButton();
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

  private async postMessage(data: IEclipseIPCSend): Promise<boolean> {
    if (this.webview) {
      return this.webview.webview.postMessage(data);
    } else {
      return false;
    }
  }

  private async handleEclipseButton() {
    // Find old project
    const oldProject = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'eclipse-workspace')),
      filters: {
        'Eclipse Project': ['properties'],
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
        type: 'eclipse',
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

  private async handleImport(data: IEclipseIPCData) {
    if (!path.isAbsolute(data.toFolder)) {
      vscode.window.showErrorMessage('Can only extract to absolute path');
      return;
    }
    const oldProjectPath = path.dirname(data.fromProps);

    const cpp = await promisifyExists(path.join(oldProjectPath, '.cproject'));

    // tslint:disable-next-line:no-unsafe-any
    const values = javaProperties.of(data.fromProps);

    // tslint:disable-next-line:no-unsafe-any
    const javaPackageRobotClass: string = values.get('robot.class', '');

    // tslint:disable-next-line:no-unsafe-any
    const javaRobotPackage: string = values.get('package', '');

    const javaRobotClass = javaPackageRobotClass.substr(javaRobotPackage.length + 1);

    let toFolder = data.toFolder;

    if (data.newFolder) {
      toFolder = path.join(data.toFolder, data.projectName);
    }

    try {
      await promisifyMkdirp(toFolder);
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

    let mainFile = await promisifyReadFile(path.join(this.resourceRoot, 'eclipseprojectmain.java'));
    mainFile = mainFile.replace(new RegExp('insertnewpackagehere', 'g'), javaRobotPackage)
                       .replace(new RegExp('ROBOTCLASSNAMEHERE', 'g'), javaRobotClass);

    const filePath = path.join(toFolder, 'src', 'main', 'java', ...javaRobotPackage.split('.'), 'Main.java');
    await promisifyWriteFile(filePath, mainFile);

    const jsonFilePath = path.join(toFolder, '.wpilib', 'wpilib_preferences.json');

    const parsed = JSON.parse(await promisifyReadFile(jsonFilePath)) as IPreferencesJson;
    parsed.teamNumber = parseInt(data.teamNumber, 10);
    await promisifyWriteFile(jsonFilePath, JSON.stringify(parsed, null, 4));

    await ExampleTemplateAPI.PromptForProjectOpen(vscode.Uri.file(toFolder));
  }

  private async asyncInitialize() {
    await this.loadWebpage(path.join(extensionContext.extensionPath, 'resources', 'webviews', 'eclipseimport.html'),
      path.join(extensionContext.extensionPath, 'resources', 'dist', 'eclipseimportpage.js'));
  }
}
