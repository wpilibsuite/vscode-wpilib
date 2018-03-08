'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { IExampleTemplateAPI, IExampleTemplateCreator } from './shared/externalapi';
import { generateCopy } from './generator';

interface JsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
}

export class Examples {
  private readonly exampleResourceName = 'cppexamples.json';

  constructor(resourceRoot: string, core: IExampleTemplateAPI) {
    let resourceFile = path.join(resourceRoot, 'examples', this.exampleResourceName);
    let examplesFolder = path.join(resourceRoot, 'examples');
    let gradleFolder = path.join(resourceRoot, 'gradlebase');
    fs.readFile(resourceFile, 'utf8', (err, data) => {
      if (err) {
        console.log(err);
        return;
      }
      let examples: JsonLayout[] = jsonc.parse(data);
      for (let e of examples) {
        let provider: IExampleTemplateCreator = {
          getLanguage(): string {
            return 'cpp';
          },
          getDescription(): string {
            return e.description;
          },
          getDisplayName(): string {
            return e.name;
          },
          async generate(folderInto: vscode.Uri): Promise<boolean> {
            try {
              await generateCopy(vscode.Uri.file(path.join(examplesFolder, e.foldername)),
                vscode.Uri.file(gradleFolder), folderInto);
            } catch (err) {
              console.log(err);
              return false;
            }
            return true;
          }
        };
        core.addExampleProvider(provider);
      }
    });
  }

  dispose() {

  }
}
