'use strict';
import { readFile } from 'fs/promises';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, IExampleTemplateCreator } from '../api';
import { logger } from '../logger';
import { localize as i18n } from '../locale';
import { generateCopyCpp, generateCopyJava, generateCopyPython } from './generator';

export interface ITemplateJsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  gradlebase: string;
  robotclass: string;
  commandversion: number;
  extravendordeps?: string[];
  hasunittests?: boolean;
}

const exampleResourceName = 'templates.json';

export async function registerProjectTemplates(
  resourceRoot: string,
  language: string,
  core: IExampleTemplateAPI
) {
  const templatesFolder = path.join(resourceRoot, 'src', 'templates');
  const templatesTestFolder = path.join(resourceRoot, 'src', 'templates_test');
  const resourceFile = path.join(templatesFolder, exampleResourceName);
  const gradleBasePath = path.join(path.dirname(resourceRoot), 'gradle');
  try {
    const data = await readFile(resourceFile, 'utf8');
    const templates: ITemplateJsonLayout[] = jsonc.parse(data) as ITemplateJsonLayout[];
    for (const e of templates) {
      const vendordeps: string[] = e.extravendordeps ?? [];
      const commandVersion: string = e.commandversion ? e.commandversion.toString() : '2';
      if (commandVersion === '3') {
        vendordeps.push('commandsv3');
      } else {
        vendordeps.push('commandsv2');
      }
      const provider: IExampleTemplateCreator = {
        getLanguage(): string {
          return language;
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
            if (e.hasunittests) {
              testFolder = path.join(templatesTestFolder, e.foldername);
            }
            if (language === 'java') {
              const mainJavaFile = path.join(resourceRoot, 'src', 'Main.java');
              if (
                !(await generateCopyJava(
                  resourceRoot,
                  path.join(templatesFolder, e.foldername),
                  testFolder,
                  path.join(gradleBasePath, e.gradlebase),
                  folderInto.fsPath,
                  mainJavaFile,
                  'first.robot.' + e.robotclass,
                  path.join('first', 'robot'),
                  false,
                  vendordeps
                ))
              ) {
                vscode.window.showErrorMessage(
                  i18n('message', 'Cannot create into non empty folder')
                );
                return false;
              }
            } else if (language === 'cpp') {
              if (
                !(await generateCopyCpp(
                  resourceRoot,
                  path.join(templatesFolder, e.foldername),
                  testFolder,
                  path.join(gradleBasePath, e.gradlebase),
                  folderInto.fsPath,
                  false,
                  vendordeps
                ))
              ) {
                vscode.window.showErrorMessage(
                  i18n('message', 'Cannot create into non empty folder')
                );
                return false;
              }
            } else {
              if (
                !(await generateCopyPython(
                  path.join(templatesFolder, e.foldername),
                  templatesTestFolder,
                  path.join(gradleBasePath, e.gradlebase),
                  folderInto.fsPath,
                  vendordeps
                ))
              ) {
                vscode.window.showErrorMessage(
                  i18n('message', 'Cannot create into non empty folder')
                );
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
  } catch (err) {
    logger.log('Template error: ', err);
  }
}
