'use strict';

import * as vscode from 'vscode';
import { ICodeBuilder, IBuildTestAPI } from './shared/externalapi';
import { PreferencesAPI } from './preferencesapi';

interface ICodeBuilderQuickPick extends vscode.QuickPickItem {
  builder: ICodeBuilder;
}

export class BuildTestAPI extends IBuildTestAPI {
  private languageChoices: string[] = [];
  private builders: ICodeBuilderQuickPick[] = [];
  private testers: ICodeBuilderQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];
  private preferences: PreferencesAPI;

  constructor(preferences: PreferencesAPI) {
    super();
    this.preferences = preferences;
  }

  public buildCode(workspace: vscode.WorkspaceFolder, online: boolean): Promise<boolean> {
    return this.buildTestCommon(workspace, this.builders, online);
  }
  public testCode(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    return this.buildTestCommon(workspace, this.testers, false);
  }

  private async buildTestCommon(workspace: vscode.WorkspaceFolder, builder: ICodeBuilderQuickPick[], online: boolean): Promise<boolean> {
    if (builder.length <= 0) {
      vscode.window.showInformationMessage('No registered deployers');
      return false;
    }

    const preferences = this.preferences.getPreferences(workspace);

    if (preferences === undefined) {
      vscode.window.showInformationMessage('Could not find a workspace');
      return false;
    }

    const validBuilders: ICodeBuilderQuickPick[] = [];
    for (const d of builder) {
      if (await d.builder.getIsCurrentlyValid(workspace)) {
        validBuilders.push(d);
      }
    }

    let langSelection: ICodeBuilderQuickPick;

    if (validBuilders.length <= 0) {
      vscode.window.showInformationMessage('No available builders');
      return false;
    } else if (validBuilders.length === 1) {
      langSelection = validBuilders[0];
    } else {
      const selection = await vscode.window.showQuickPick(validBuilders, { placeHolder: 'Pick a language' });
      if (selection === undefined) {
        await vscode.window.showInformationMessage('Selection exited. Cancelling');
        return false;
      }
      langSelection = selection;
    }

    if (preferences.getAutoSaveOnDeploy()) {
      await vscode.workspace.saveAll();
    }

    const deploySuccess = await langSelection.builder.runBuilder(workspace, online);
    return deploySuccess;
  }

  public registerCodeBuild(builder: ICodeBuilder): void {
    const qpi: ICodeBuilderQuickPick = {
      builder: builder,
      label: builder.getDisplayName(),
      description: builder.getDescription()
    };
    this.builders.push(qpi);
  }
  public registerCodeTest(builder: ICodeBuilder): void {
    const qpi: ICodeBuilderQuickPick = {
      builder: builder,
      label: builder.getDisplayName(),
      description: builder.getDescription()
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
}
