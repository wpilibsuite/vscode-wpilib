'use strict';

import { readFile } from 'fs/promises';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI } from '../api';
import { localize as i18n } from '../locale';
import { setDesktopEnabled } from '../shared/generator';
import { extensionContext, promptForProjectOpen } from '../utilities';
import {
  IProjectIPCData,
  IProjectIPCReceive,
  IProjectIPCSend,
  ISnippetOption,
  ProjectType,
} from './pages/projectcreatorpagetypes';
import { WebViewBase } from './webviewbase';

export class ProjectCreator extends WebViewBase {
  public static async Create(
    exampleTemplateApi: IExampleTemplateAPI,
    resourceRoot: string
  ): Promise<ProjectCreator> {
    const te = new ProjectCreator(exampleTemplateApi, resourceRoot);
    await te.asyncInitialize();
    return te;
  }

  private exampleTemplateApi: IExampleTemplateAPI;

  private constructor(exampleTemplateApi: IExampleTemplateAPI, resourceRoot: string) {
    super('wpilibprojectcreator', i18n('projectcreator', 'WPILib Project Creator'), resourceRoot);
    this.exampleTemplateApi = exampleTemplateApi;

    this.disposables.push(
      vscode.commands.registerCommand('wpilibcore.createNewProject', () => {
        this.displayWebView(vscode.ViewColumn.Active, true, {
          enableScripts: true,
          retainContextWhenHidden: true,
        });
        if (this.webview) {
          this.webview.webview.onDidReceiveMessage(
            async (data: IProjectIPCReceive) => {
              switch (data.type) {
                case 'newproject':
                  if (data.data) {
                    await this.handleNewProjectLoc(data.data);
                  }
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
                case 'snippets':
                  if (data.data) {
                    await this.handleSnippets(data.data.language, data.requestId);
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
            },
            undefined,
            this.disposables
          );
        }
      })
    );
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
      vscode.window.showErrorMessage(i18n('message', 'Can only extract to absolute path'));
      return;
    }
    const successful = await this.exampleTemplateApi.createProject(
      data.projectType === ProjectType.Template,
      data.language,
      data.base,
      data.toFolder,
      data.newFolder,
      data.projectName,
      parseInt(data.teamNumber, 10)
    );

    if (!successful) {
      return;
    }

    const toFolder = data.newFolder ? path.join(data.toFolder, data.projectName) : data.toFolder;

    if (data.desktop) {
      const buildgradle = path.join(toFolder, 'build.gradle');

      await setDesktopEnabled(buildgradle, true);
    }

    await promptForProjectOpen(vscode.Uri.file(toFolder));
  }

  private async handleProjectType() {
    // Instead of showing a QuickPick, return the list of languages directly to the UI
    const templateLanguages = this.exampleTemplateApi.getLanguages(true);

    await this.postMessage({
      data: templateLanguages,
      type: 'language',
    });
  }

  private async handleLanguage(data: IProjectIPCData) {
    // Get languages for the selected project type
    const languages = this.exampleTemplateApi.getLanguages(
      data.projectType === ProjectType.Template
    );

    // Return the list of languages to the UI
    await this.postMessage({
      data: languages,
      type: 'language',
    });
  }

  private async handleBase(data: IProjectIPCData) {
    // Get bases for the selected language and project type
    const bases = this.exampleTemplateApi
      .getBases(data.projectType === ProjectType.Template, data.language)
      .filter((item) => !item.label.endsWith(' (Snippet)'));

    // Return the complete base objects to the UI
    await this.postMessage({
      data: bases.map((item) => ({
        label: item.label,
        description: item.description ?? '',
        tags: item.tags ?? [],
      })),
      type: 'base',
    });
  }

  private async handleSnippets(language: string, requestId?: number) {
    if (language !== 'java' && language !== 'cpp') {
      await this.postMessage({ type: 'snippets', data: [], requestId });
      return;
    }

    const snippetsFile = path.join(this.resourceRoot, language, 'src', 'snippets', 'snippets.json');
    try {
      const contents = await readFile(snippetsFile, 'utf8');
      const snippets = jsonc.parse(contents) as ISnippetOption[];
      await this.postMessage({
        type: 'snippets',
        data: Array.isArray(snippets)
          ? snippets.map(({ name, description, tags }) => ({
              name,
              description,
              tags: tags ?? [],
            }))
          : [],
        requestId,
      });
    } catch {
      await this.postMessage({ type: 'snippets', data: [], requestId });
    }
  }

  private async handleNewProjectLoc(data: IProjectIPCData) {
    const open: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: i18n('ui', 'Select Folder'),
      defaultUri: data.toFolder.length > 0 ? vscode.Uri.file(data.toFolder) : undefined,
    };
    const result = await vscode.window.showOpenDialog(open);

    if (!result) {
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
    const htmlPath = path.join(
      extensionContext.extensionPath,
      'resources',
      'webviews',
      'projectcreator.html'
    );
    const scriptPath = path.join(
      extensionContext.extensionPath,
      'resources',
      'dist',
      'projectcreatorpage.js'
    );

    // Include the 'projectcreator' domain for localization
    await this.loadWebpage(htmlPath, scriptPath, ['projectcreator']);
  }
}
