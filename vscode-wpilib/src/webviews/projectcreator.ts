'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI } from 'vscode-wpilibapi';
import { ExampleTemplateAPI } from '../exampletemplateapi';
import { extensionContext, setDesktopEnabled } from '../utilities';
import { IProjectIPCData, IProjectIPCReceive, IProjectIPCSend } from './pages/projectcreatorpage';
import { WebViewBase } from './webviewbase';

export class ProjectCreator extends WebViewBase {
  public static async Create(exampleTemplateApi: IExampleTemplateAPI, resourceRoot: string): Promise<ProjectCreator> {
    const te = new ProjectCreator(exampleTemplateApi, resourceRoot);
    await te.asyncInitialize();
    return te;
  }

  private exampleTemplateApi: IExampleTemplateAPI;

  private constructor(exampleTemplateApi: IExampleTemplateAPI, resourceRoot: string) {
    super('wpilibprojectcreator', 'WPILib Project Creator', resourceRoot);
    this.exampleTemplateApi = exampleTemplateApi;

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.createNewProject', async () => {
      this.displayWebView(vscode.ViewColumn.Active, true, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      if (this.webview) {
        this.webview.webview.onDidReceiveMessage(async (data: IProjectIPCReceive) => {
          switch (data.type) {
            case 'newproject':
              await this.handleNewProjectLoc();
              break;
            case 'projecttype':
              await this.handleProjectType();
              break;
            case 'language':
              if (data.data) {
                await this.handleLanguage(data.data);
              }
              break;
            case 'base':
              if (data.data) {
                await this.handleBase(data.data);
              }
              break;
            case 'createproject':
              if (data.data) {
                await this.createProject(data.data);
              }
              break;
            default:
              break;
          }
        }, undefined, this.disposables);
      }
    }));
  }

  private async postMessage(data: IProjectIPCSend): Promise<boolean> {
    if (this.webview) {
      return this.webview.webview.postMessage(data);
    } else {
      return false;
    }
  }

  private async createProject(data: IProjectIPCData) {
    if (!path.isAbsolute(data.toFolder)) {
      vscode.window.showErrorMessage('Can only extract to absolute path');
      return;
    }
    await this.exampleTemplateApi.createProject(data.template, data.language, data.base, data.toFolder, data.newFolder,
      data.projectName, parseInt(data.teamNumber, 10));

    const toFolder = data.newFolder ? path.join(data.toFolder, data.projectName) : data.toFolder;

    if (data.desktop) {
      const buildgradle = path.join(toFolder, 'build.gradle');

      await setDesktopEnabled(buildgradle, true);
    }

    await ExampleTemplateAPI.PromptForProjectOpen(vscode.Uri.file(toFolder));
  }

  private async handleProjectType() {
    const result = await vscode.window.showQuickPick(['Template', 'Example'], {
      placeHolder: 'Select a project type.',
    });
    if (result) {
      await this.postMessage({
        data: result === 'Template',
        type: 'projecttype',
      });
    }
  }

  private async handleLanguage(data: IProjectIPCData) {
    const result = await vscode.window.showQuickPick(this.exampleTemplateApi.getLanguages(data.template), {
      placeHolder: 'Select a language',
    });
    if (result) {
      await this.postMessage({
        data: result,
        type: 'language',
      });
    }
  }

  private async handleBase(data: IProjectIPCData) {
    const result = await vscode.window.showQuickPick(this.exampleTemplateApi.getBases(data.template, data.language), {
      placeHolder: 'Select a project base',
    });
    if (result) {
      await this.postMessage({
        data: result.label,
        type: 'base',
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

  private async asyncInitialize() {
    await this.loadWebpage(path.join(extensionContext.extensionPath, 'resources', 'webviews', 'projectcreator.html'),
      path.join(extensionContext.extensionPath, 'resources', 'dist', 'projectcreatorpage.js'));
  }
}
