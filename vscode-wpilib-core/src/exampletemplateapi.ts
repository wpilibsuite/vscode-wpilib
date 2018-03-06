'use scrict';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, ITemplateExampleCreator } from './shared/externalapi';

interface ICreatorQuickPick extends vscode.QuickPickItem {
  creator: ITemplateExampleCreator;
}

interface ILanguageQuickPick extends vscode.QuickPickItem {
  creators: ICreatorQuickPick[];
}

export class ExampleTemplateAPI extends IExampleTemplateAPI {
  private disposables: vscode.Disposable[] = [];
  private templates: ILanguageQuickPick[] = [];
  private examples: ILanguageQuickPick[] = [];

  addTemplateProvider(provider: ITemplateExampleCreator): void {
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
  addExampleProvider(provider: ITemplateExampleCreator): void {
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
      let selection = await vscode.window.showQuickPick(langs, { placeHolder: 'Pick a language'});
      if (selection === undefined) {
        await vscode.window.showInformationMessage('Langauge not picked, cancelling.');
        return false;
      }
      return await this.runSelection(selection, type);
    }
  }

  private async runSelection(lang: ILanguageQuickPick, type: string): Promise<boolean> {
    let selection = await vscode.window.showQuickPick(lang.creators, { placeHolder: `Pick an ${type.toLowerCase()}`});
    if (selection === undefined) {
      await vscode.window.showInformationMessage('Invalid selection');
      return false;
    }
    return await selection.creator.generate();
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
