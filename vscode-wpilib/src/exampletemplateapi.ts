'use scrict';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, IExampleTemplateCreator } from './shared/externalapi';

interface ICreatorQuickPick extends vscode.QuickPickItem {
  creator: IExampleTemplateCreator;
}

interface ILanguageQuickPick extends vscode.QuickPickItem {
  creators: ICreatorQuickPick[];
}

export class ExampleTemplateAPI extends IExampleTemplateAPI {
  private disposables: vscode.Disposable[] = [];
  private templates: ILanguageQuickPick[] = [];
  private examples: ILanguageQuickPick[] = [];

  public addTemplateProvider(provider: IExampleTemplateCreator): void {
    let lp: ILanguageQuickPick | undefined;
    for (const p of this.templates) {
      if (p.label === provider.getLanguage()) {
        lp = p;
        break;
      }
    }

    if (lp === undefined) {
      // Not found
      lp = {
        creators: [],
        description: 'Choice of language',
        label: provider.getLanguage(),
      };
      this.templates.push(lp);
    }

    lp.creators.push({
      creator: provider,
      description: provider.getDescription(),
      label: provider.getDisplayName(),
    });
  }
  public addExampleProvider(provider: IExampleTemplateCreator): void {
    let lp: ILanguageQuickPick | undefined;
    for (const p of this.examples) {
      if (p.label === provider.getLanguage()) {
        lp = p;
        break;
      }
    }

    if (lp === undefined) {
      // Not found
      lp = {
        creators: [],
        description: 'Choice of language',
        label: provider.getLanguage(),
      };
      this.examples.push(lp);
    }

    lp.creators.push({
      creator: provider,
      description: provider.getDescription(),
      label: provider.getDisplayName(),
    });
  }

  public createExample(): Promise<boolean> {
    return this.getSelection('Example', this.examples);
  }

  public createTemplate(): Promise<boolean> {
    return this.getSelection('Template', this.templates);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async getSelection(type: string, langs: ILanguageQuickPick[]): Promise<boolean> {
    if (langs.length === 0) {
      vscode.window.showInformationMessage(`No ${type.toLowerCase()} providers found`);
      return false;
    } else if (langs.length === 1) {
      return this.runSelection(langs[0], type);
    } else {
      const selection = await vscode.window.showQuickPick(langs, { placeHolder: 'Pick a language' });
      if (selection === undefined) {
        await vscode.window.showInformationMessage('Langauge not picked, cancelling.');
        return false;
      }
      return this.runSelection(selection, type);
    }
  }

  private async runSelection(lang: ILanguageQuickPick, type: string): Promise<boolean> {
    const selection = await vscode.window.showQuickPick(lang.creators, { placeHolder: `Pick an ${type.toLowerCase()}` });
    if (selection === undefined) {
      await vscode.window.showInformationMessage('Invalid selection');
      return false;
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
      await vscode.window.showInformationMessage('cancelled');
      return false;
    }
    // TODO: Check if folder is empty

    if (result.length !== 1) {
      console.log('weird');
      return false;
    }

    const success = await selection.creator.generate(result[0]);
    if (success) {
      // Search workspaces
      const workspaces = vscode.workspace.workspaceFolders;
      if (workspaces !== undefined && workspaces.length > 0) {
        for (const w of workspaces) {
          if (w.uri === result[0]) {
            return true;
          }
        }
      }
      const openSelection = await vscode.window.showInformationMessage('Would you like to open the folder?',
                                                                       'Yes (Current Window)', 'Yes (New Window)', 'No');
      if (openSelection === undefined) {
        return true;
      } else if (openSelection === 'Yes (Current Window)') {
        await vscode.commands.executeCommand('vscode.openFolder', result[0], false);
      } else if (openSelection === 'Yes (New Window)') {
        await vscode.commands.executeCommand('vscode.openFolder', result[0], true);
      } else {
        return true;
      }
    }
    return true;
  }
}
