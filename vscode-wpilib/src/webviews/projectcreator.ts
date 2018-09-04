'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI } from 'vscode-wpilibapi';
import { extensionContext } from '../utilities';
import { WebViewBase } from './webviewbase';

interface ISelectorData {
  template: boolean;
  language: string;
}

interface ICreateProjectData {
  template: boolean;
  language: string;
  base: string;
  toFolder: string;
  newFolder: boolean;
  projectName: string;
  teamNumber: string;
}

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
        this.webview.webview.onDidReceiveMessage(async (data) => {
          // tslint:disable-next-line:no-unsafe-any
          switch (data.type) {
            case 'newproject':
              await this.handleNewProjectLoc();
              break;
            case 'projecttype':
              await this.handleProjectType();
              break;
            case 'language':
              // tslint:disable-next-line:no-unsafe-any
              await this.handleLanguage(data.data);
              break;
            case 'base':
              // tslint:disable-next-line:no-unsafe-any
              await this.handleBase(data.data);
              break;
            case 'createproject':
              // tslint:disable-next-line:no-unsafe-any
              await this.createProject(data.data);
              break;
            default:
              break;
          }
        }, undefined, this.disposables);
      }
    }));
  }

  private async createProject(data: ICreateProjectData) {
    await this.exampleTemplateApi.createProject(data.template, data.language, data.base, data.toFolder, data.newFolder,
      data.projectName, parseInt(data.teamNumber, 10));
  }

  private async handleProjectType() {
    const result = await vscode.window.showQuickPick(['Template', 'Example'], {
      placeHolder: 'Select a project type.',
    });
    if (result && this.webview) {
      this.webview.webview.postMessage({
        data: result === 'Template',
        type: 'projecttype',
      });
    }
  }

  private async handleLanguage(data: ISelectorData) {
    const result = await vscode.window.showQuickPick(this.exampleTemplateApi.getLanguages(data.template), {
      placeHolder: 'Select a language',
    });
    if (result && this.webview) {
      this.webview.webview.postMessage({
        data: result,
        type: 'language',
      });
    }
  }

  private async handleBase(data: ISelectorData) {
    const result = await vscode.window.showQuickPick(this.exampleTemplateApi.getBases(data.template, data.language), {
      placeHolder: 'Select a project base',
    });
    if (result && this.webview) {
      this.webview.webview.postMessage({
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
      await this.webview.webview.postMessage({
        data: result[0].fsPath,
        type: 'newproject',
      });
    }
  }

  private async asyncInitialize() {
    await this.loadWebpage(path.join(extensionContext.extensionPath, 'resources', 'webviews', 'projectcreator.html'),
      path.join(extensionContext.extensionPath, 'resources', 'webviews', 'projectcreator.js'));
  }
}
