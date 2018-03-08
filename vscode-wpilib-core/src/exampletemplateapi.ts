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

  addTemplateProvider(provider: IExampleTemplateCreator): void {
    let lp: ILanguageQuickPick | undefined = undefined;
    for (let p of this.templates) {
      if (p.label === provider.getLanguage()) {
        lp = p;
        break;
      }
    }

    if (lp === undefined) {
      // Not found
      lp = {
        creators: [],
        label: provider.getLanguage(),
        description: 'Choice of language'
      };
      this.templates.push(lp);
    }

    lp.creators.push({
      creator: provider,
      label: provider.getDisplayName(),
      description: provider.getDescription()
    });
  }
  addExampleProvider(provider: IExampleTemplateCreator): void {
    let lp: ILanguageQuickPick | undefined = undefined;
    for (let p of this.examples) {
      if (p.label === provider.getLanguage()) {
        lp = p;
        break;
      }
    }

    if (lp === undefined) {
      // Not found
      lp = {
        creators: [],
        label: provider.getLanguage(),
        description: 'Choice of language'
      };
      this.examples.push(lp);
    }

    lp.creators.push({
      creator: provider,
      label: provider.getDisplayName(),
      description: provider.getDescription()
    });
  }
  createExample(): Promise<boolean> {
    return this.getSelection('Example', this.examples);
  }
  createTemplate(): Promise<boolean> {
    return this.getSelection('Template', this.templates);
  }

  private async getSelection(type: string, langs: ILanguageQuickPick[]): Promise<boolean> {
    if (langs.length === 0) {
      vscode.window.showInformationMessage(`No ${type.toLowerCase()} providers found`);
      return false;
    } else if (langs.length === 1) {
      return await this.runSelection(langs[0], type);
    } else {
      let selection = await vscode.window.showQuickPick(langs, { placeHolder: 'Pick a language' });
      if (selection === undefined) {
        await vscode.window.showInformationMessage('Langauge not picked, cancelling.');
        return false;
      }
      return await this.runSelection(selection, type);
    }
  }

  private async runSelection(lang: ILanguageQuickPick, type: string): Promise<boolean> {
    let selection = await vscode.window.showQuickPick(lang.creators, { placeHolder: `Pick an ${type.toLowerCase()}` });
    if (selection === undefined) {
      await vscode.window.showInformationMessage('Invalid selection');
      return false;
    }
    // Ask user for a folder
    let open: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Folder'
    };
    let result = await vscode.window.showOpenDialog(open);
    if (result === undefined) {
      await vscode.window.showInformationMessage('cancelled');
      return false;
    }
    // TODO: Check if folder is empty

    if (result.length !== 1) {
      console.log('weird');
      return false;
    }

    let success = await selection.creator.generate(result[0]);
    if (success) {
      // Search workspaces
      let workspaces = vscode.workspace.workspaceFolders;
      if (workspaces !== undefined && workspaces.length > 0) {
        for (let w of workspaces) {
          if (w.uri === result[0]) {
            return true;
          }
        }
      }
      let selection = await vscode.window.showInformationMessage('Would you like to open the folder?', 'Yes (Current Window)', 'Yes (New Window)', 'No');
      if (selection === undefined) {
        return true;
      } else if (selection === 'Yes (Current Window)') {
        await vscode.commands.executeCommand('vscode.openFolder', result[0], false);
      } else if (selection === 'Yes (New Window)') {
        await vscode.commands.executeCommand('vscode.openFolder', result[0], true);
      } else {
        return true;
      }
    }
    return true;
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
