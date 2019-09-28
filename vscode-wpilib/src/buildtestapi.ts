'use strict';

import * as vscode from 'vscode';
import { IBuildTestAPI, ICodeBuilder } from 'vscode-wpilibapi';
import { localize as i18n } from './locale';
import { PreferencesAPI } from './preferencesapi';

interface ICodeBuilderQuickPick extends vscode.QuickPickItem {
  builder: ICodeBuilder;
}

export class BuildTestAPI implements IBuildTestAPI {
  private languageChoices: string[] = [];
  private builders: ICodeBuilderQuickPick[] = [];
  private testers: ICodeBuilderQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;

  constructor(preferences: PreferencesAPI) {
    this.preferences = preferences;
  }

  public buildCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    return this.buildTestCommon(workspace, this.builders, source, args);
  }

  public testCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    return this.buildTestCommon(workspace, this.testers, source, args);
  }

  public registerCodeBuild(builder: ICodeBuilder): void {
    const qpi: ICodeBuilderQuickPick = {
      builder,
      description: builder.getDescription(),
      label: builder.getDisplayName(),
    };
    this.builders.push(qpi);
  }
  public registerCodeTest(builder: ICodeBuilder): void {
    const qpi: ICodeBuilderQuickPick = {
      builder,
      description: builder.getDescription(),
      label: builder.getDisplayName(),
    };
    this.testers.push(qpi);
  }

  public addLanguageChoice(language: string): void {
    this.languageChoices.push(language);
  }

  public getLanguageChoices(): string[] {
    return this.languageChoices;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async buildTestCommon(workspace: vscode.WorkspaceFolder, builder: ICodeBuilderQuickPick[],
                                source: vscode.Uri | undefined, args: string[]): Promise<boolean> {
    if (builder.length <= 0) {
      vscode.window.showInformationMessage(i18n('message', 'No registered deployers'));
      return false;
    }

    const preferences = this.preferences.getPreferences(workspace);

    const validBuilders: ICodeBuilderQuickPick[] = [];
    for (const d of builder) {
      if (await d.builder.getIsCurrentlyValid(workspace)) {
        validBuilders.push(d);
      }
    }

    let langSelection: ICodeBuilderQuickPick;

    if (validBuilders.length <= 0) {
      vscode.window.showInformationMessage(i18n('message', 'No available builders'));
      return false;
    } else if (validBuilders.length === 1) {
      langSelection = validBuilders[0];
    } else {
      const selection = await vscode.window.showQuickPick(validBuilders, { placeHolder: i18n('ui', 'Pick a language') });
      if (selection === undefined) {
        vscode.window.showInformationMessage(i18n('message', 'Selection exited. Cancelling'));
        return false;
      }
      langSelection = selection;
    }

    if (preferences.getAutoSaveOnDeploy()) {
      await vscode.workspace.saveAll();
    }

    const deploySuccess = await langSelection.builder.runBuilder(workspace, source, ...args);
    return deploySuccess;
  }
}
