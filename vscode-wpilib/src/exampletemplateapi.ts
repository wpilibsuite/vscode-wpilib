'use scrict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, IExampleTemplateCreator } from './shared/externalapi';
import { promisifyMkdirp } from './shared/generator';

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

  public getLanguages(template: boolean): string[] {
    const retSet: Set<string> = new Set();
    if (template) {
      for (const t of this.templates) {
        retSet.add(t.label);
      }
    } else {
      for (const t of this.examples) {
        retSet.add(t.label);
      }
    }
    return Array.from(retSet);
  }

  public getBases(template: boolean, language: string): string[] {
    const retSet: Set<string> = new Set();
    if (template) {
      for (const t of this.templates) {
        if (t.label === language) {
          for (const c of t.creators) {
            retSet.add(c.label);
          }
        }
      }
    } else {
      for (const t of this.examples) {
        if (t.label === language) {
          for (const c of t.creators) {
            retSet.add(c.label);
          }
        }
      }
    }
    return Array.from(retSet);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async createProject(template: boolean, language: string, base: string,
                             toFolder: string, newFolder: boolean, projectName: string): Promise<boolean> {
    if (template) {
      for (const t of this.templates) {
        if (t.label === language) {
          for (const c of t.creators) {
            if (c.label === base) {
              return this.handleGenerate(c.creator, toFolder, newFolder, projectName);
            }
          }
        }
      }
    } else {
      for (const t of this.examples) {
        if (t.label === language) {
          for (const c of t.creators) {
            if (c.label === base) {
              return this.handleGenerate(c.creator, toFolder, newFolder, projectName);
            }
          }
        }
      }
    }
    return false;
  }

  private async handleGenerate(creator: IExampleTemplateCreator, toFolderOrig: string, newFolder: boolean,
                               projectName: string): Promise<boolean> {
    let toFolder = toFolderOrig;

    if (newFolder) {
      toFolder = path.join(toFolderOrig, projectName);
    }

    try {
      await promisifyMkdirp(toFolder);
    } catch {
      //
    }
    const toFolderUri = vscode.Uri.file(toFolder);

    const success = await creator.generate(toFolderUri);

    if (!success) {
      return false;
    }

    const openSelection = await vscode.window.showInformationMessage('Would you like to open the folder?',
        'Yes (Current Window)', 'Yes (New Window)', 'No');
    if (openSelection === undefined) {
      return true;
    } else if (openSelection === 'Yes (Current Window)') {
      await vscode.commands.executeCommand('vscode.openFolder', toFolderUri, false);
    } else if (openSelection === 'Yes (New Window)') {
      await vscode.commands.executeCommand('vscode.openFolder', toFolderUri, true);
    } else {
      return true;
    }
    return true;
  }
}
