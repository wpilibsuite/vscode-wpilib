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
  private readonly exampleResourceName = 'javaexamples.json';

  constructor(resourceRoot: string, core: IExampleTemplateAPI) {
    const examplesFolder = path.join(resourceRoot, 'src', 'main', 'java', 'edu', 'wpi', 'first', 'wpilibj', 'examples');
    const resourceFile = path.join(examplesFolder, this.exampleResourceName);
    const gradleFolder = path.join(resourceRoot, 'gradlebase');
    fs.readFile(resourceFile, 'utf8', (err, data) => {
      if (err) {
        console.log(err);
        return;
      }
      const examples: JsonLayout[] = jsonc.parse(data);
      for (const e of examples) {
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

  public dispose() {

  }
}
