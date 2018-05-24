'use strict';

import * as vscode from 'vscode';
import { PreferencesAPI } from './preferencesapi';
import { IBuildTestAPI, ICodeBuilder } from './shared/externalapi';

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

  public buildCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean> {
    return this.buildTestCommon(workspace, this.builders, source);
  }

  public testCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean> {
    return this.buildTestCommon(workspace, this.testers, source);
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
                                source: vscode.Uri | undefined): Promise<boolean> {
    if (builder.length <= 0) {
      vscode.window.showInformationMessage('No registered deployers');
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

    const deploySuccess = await langSelection.builder.runBuilder(workspace, source);
    return deploySuccess;
  }
}
