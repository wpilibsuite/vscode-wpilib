'use strict';
import { readFile } from 'fs/promises';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, IExampleTemplateCreator } from '../api';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import { generateCopyCpp, generateCopyJava } from './generator';

export interface IExampleJsonLayout {
  name: string;
  description: string;
  tags?: string[];
  foldername: string;
  gradlebase: string;
  robotclass?: string;
  commandversion?: number;
  extravendordeps?: string[];
  hasunittests?: boolean;
}

type ExampleCatalog = 'examples' | 'snippets';

export async function registerExamples(
  resourceRoot: string,
  java: boolean,
  core: IExampleTemplateAPI
) {
  await registerExampleCatalog(resourceRoot, java, core, 'examples');
  await registerExampleCatalog(resourceRoot, java, core, 'snippets');
}

async function registerExampleCatalog(
  resourceRoot: string,
  java: boolean,
  core: IExampleTemplateAPI,
  catalog: ExampleCatalog
) {
  const catalogFolder = path.join(resourceRoot, 'src', catalog);
  const catalogTestFolder = path.join(resourceRoot, 'src', `${catalog}_test`);
  const resourceFile = path.join(catalogFolder, `${catalog}.json`);
  const gradleBasePath = path.join(path.dirname(resourceRoot), 'gradle');
  try {
    const data = await readFile(resourceFile, 'utf8');
    const entries: IExampleJsonLayout[] = jsonc.parse(data) as IExampleJsonLayout[];
    for (const entry of entries) {
      const vendordeps = [...(entry.extravendordeps ?? [])];
      vendordeps.push(entry.commandversion === 3 ? 'commandsv3' : 'commandsv2');
      const provider: IExampleTemplateCreator = {
        getLanguage(): string {
          return java ? 'java' : 'cpp';
        },
        getDescription(): string {
          return entry.description;
        },
        getDisplayName(): string {
          return catalog === 'snippets' ? `${entry.name} (Snippet)` : entry.name;
        },
        getTags(): string[] {
          return entry.tags ?? [];
        },
        async generate(folderInto: vscode.Uri): Promise<boolean> {
          try {
            const testFolder = entry.hasunittests
              ? path.join(catalogTestFolder, entry.foldername)
              : undefined;
            const sourceFolder = path.join(catalogFolder, entry.foldername);
            if (java) {
              const mainJavaFile = path.join(resourceRoot, 'src', 'Main.java');
              const packagePattern =
                catalog === 'snippets' ? 'org\\.wpilib\\.snippets\\..+?(?=;|\\.)' : undefined;
              const success = await generateCopyJava(
                resourceRoot,
                sourceFolder,
                testFolder,
                path.join(gradleBasePath, entry.gradlebase),
                folderInto.fsPath,
                mainJavaFile,
                `first.robot.${entry.robotclass ?? 'Robot'}`,
                path.join('first', 'robot'),
                false,
                vendordeps,
                packagePattern
              );
              if (!success) {
                vscode.window.showErrorMessage(
                  i18n('message', 'Cannot create into non empty folder')
                );
                return false;
              }
            } else {
              const success = await generateCopyCpp(
                resourceRoot,
                sourceFolder,
                testFolder,
                path.join(gradleBasePath, entry.gradlebase),
                folderInto.fsPath,
                false,
                vendordeps
              );
              if (!success) {
                vscode.window.showErrorMessage(
                  i18n('message', 'Cannot create into non empty folder')
                );
                return false;
              }
            }
          } catch (err) {
            logger.error(`${catalog} generation error: `, err);
            return false;
          }
          return true;
        },
      };
      core.addExampleProvider(provider);
    }
  } catch (err) {
    logger.log(`${catalog} catalog error: `, err);
  }
}
