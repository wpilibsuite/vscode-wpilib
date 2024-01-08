'use strict';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import * as vscode from '../vscodeshim';
import { IExampleTemplateAPI, IExampleTemplateCreator } from '../wpilibapishim';
import { generateCopyCpp, generateCopyJava } from './generator';

export interface ITemplateJsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  gradlebase: string;
  commandversion: number;
  extravendordeps?: string[];
  hasunittests?: boolean;
}

export class Templates {
  private readonly exampleResourceName = 'templates.json';

  constructor(resourceRoot: string, java: boolean, core: IExampleTemplateAPI) {
    const templatesFolder = path.join(resourceRoot, 'src', 'templates');
    const templatesTestFolder = path.join(resourceRoot, 'src', 'templates_test');
    const resourceFile = path.join(templatesFolder, this.exampleResourceName);
    const gradleBasePath = path.join(path.dirname(resourceRoot), 'gradle');
    fs.readFile(resourceFile, 'utf8', (err, data) => {
      if (err) {
        logger.log('Template error: ', err);
        return;
      }
      const templates: ITemplateJsonLayout[] = jsonc.parse(data) as ITemplateJsonLayout[];
      for (const e of templates) {
        const extraVendordeps: string[] = (e.extravendordeps !== undefined) ? e.extravendordeps : [];
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
              let testFolder;
              if (e.hasunittests === true) {
                testFolder = path.join(templatesTestFolder, e.foldername);
              }
              if (java) {
                if (!await generateCopyJava(resourceRoot, path.join(templatesFolder, e.foldername), testFolder,
                  path.join(gradleBasePath, e.gradlebase), folderInto.fsPath, 'frc.robot.Main', path.join('frc', 'robot'),
                  false, extraVendordeps)) {
                  vscode.window.showErrorMessage(i18n('message', 'Cannot create into non empty folder'));
                  return false;
                }
              } else {
                if (!await generateCopyCpp(resourceRoot, path.join(templatesFolder, e.foldername), testFolder,
                  path.join(gradleBasePath, e.gradlebase), folderInto.fsPath, false, extraVendordeps)) {
                  vscode.window.showErrorMessage(i18n('message', 'Cannot create into non empty folder'));
                  return false;
                }
              }
            } catch (err) {
              logger.error('template creation error', err);
              return false;
            }
            return true;
          },
        };
        core.addTemplateProvider(provider);
      }
    });
  }

  public dispose() {

  }
}
