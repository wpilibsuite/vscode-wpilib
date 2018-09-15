'use strict';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, IExampleTemplateCreator } from 'vscode-wpilibapi';
import { logger } from './logger';
import { generateCopyCpp, generateCopyJava } from './shared/generator';

export interface IExampleJsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  gradlebase: string;
}

export class Examples {
  private readonly exampleResourceName = 'examples.json';

  constructor(resourceRoot: string, java: boolean, core: IExampleTemplateAPI) {
    const examplesFolder = path.join(resourceRoot, 'src', 'examples');
    const resourceFile = path.join(examplesFolder, this.exampleResourceName);
    const gradleBasePath = path.join(path.dirname(resourceRoot), 'gradle');
    fs.readFile(resourceFile, 'utf8', (err, data) => {
      if (err) {
        logger.log(JSON.stringify(err, null, 4));
        return;
      }
      const examples: IExampleJsonLayout[] = jsonc.parse(data) as IExampleJsonLayout[];
      for (const e of examples) {
        const provider: IExampleTemplateCreator = {
          getLanguage(): string {
            return java ? 'java' : 'cpp';
          },
          getDescription(): string {
            return e.description;
          },
          getDisplayName(): string {
            return e.name;
          },
          async generate(folderInto: vscode.Uri): Promise<boolean> {
            try {
              if (java) {
                if (!await generateCopyJava(path.join(examplesFolder, e.foldername),
                  path.join(gradleBasePath, e.gradlebase), folderInto.fsPath, 'frc.robot.Robot', path.join('frc', 'robot'))) {
                  await vscode.window.showErrorMessage('Cannot create into non empty folder');
                  return false;
                }
              } else {
                if (!await generateCopyCpp(path.join(examplesFolder, e.foldername),
                  path.join(gradleBasePath, e.gradlebase), folderInto.fsPath, false)) {
                  await vscode.window.showErrorMessage('Cannot create into non empty folder');
                  return false;
                }
              }
            } catch (err) {
              logger.log(JSON.stringify(err, null, 4));
              return false;
            }
            return true;
          },
        };
        core.addExampleProvider(provider);
      }
    });
  }

  // tslint:disable-next-line:no-empty
  public dispose() {

  }
}
