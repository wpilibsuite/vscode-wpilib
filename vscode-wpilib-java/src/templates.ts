'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { IExampleTemplateAPI, IExampleTemplateCreator } from './shared/externalapi';

interface JsonLayout {
  name: string;
  description: string;
  tags: string[];
}

export class Templates {
  private readonly exampleResourceName = 'javatemplates.json';

  constructor(resourceRoot: string, core: IExampleTemplateAPI) {
    const resourceFile = path.join(resourceRoot, 'templates', this.exampleResourceName);
    fs.readFile(resourceFile, 'utf8', (err, data) => {
      if (err) {
        console.log(err);
        return;
      }
      const templates: JsonLayout[] = jsonc.parse(data);
      for (const e of templates) {
        const provider: IExampleTemplateCreator = {
          getLanguage(): string {
            return 'java';
          },
          getDescription(): string {
            return e.description;
          },
          getDisplayName(): string {
            return e.name;
          },
          async generate(_: vscode.Uri): Promise<boolean> {
            console.log('run generation');
            return true;
          }
        };
        core.addTemplateProvider(provider);
      }
    });
  }

  public dispose() {

  }
}
