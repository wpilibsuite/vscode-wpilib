'use scrict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, IExampleTemplateCreator } from 'vscode-wpilibapi';
import { logger } from './logger';
import { generateCopyCpp, generateCopyJava } from './shared/generator';
import { extensionContext, promisifyReadFile, promisifyWriteFile } from './utilities';

export async function addRobotBuilderExamples(resourceRoot: string, core: IExampleTemplateAPI) {
  const storagePath = extensionContext.storagePath;
  if (storagePath === undefined) {
    return;
  }
  const gradleBasePath = path.join(resourceRoot, 'gradle');
  const yamlFile = path.join(resourceRoot, 'robotbuilderbase.yaml');
  let yamlText = '';
  try {
    yamlText = await promisifyReadFile(yamlFile);
  } catch (err) {
    logger.error('failed to find yaml file for rb', err);
    return;
  }
  const items = ['cpp', 'java'];
  for (const lang of items) {
    const provider: IExampleTemplateCreator = {
      getLanguage(): string {
        return lang;
      },
      getDescription(): string {
        return 'RobotBuilder Base Template';
      },
      getDisplayName(): string {
        return 'RobotBuilder';
      },
      async generate(folderInto: vscode.Uri): Promise<boolean> {
        try {
          if (lang === 'java') {
            const javaPackage = 'frc.robot';
            if (!await generateCopyJava(async () => {
              const projectName = path.basename(folderInto.fsPath);
              const replacedProject = yamlText.replace(new RegExp('###PACKAGEREPLACE###', 'g'), javaPackage)
                                              .replace(new RegExp('###PROJECTNAMEREPLACE###', 'g'), projectName);
              await promisifyWriteFile(path.join(folderInto.fsPath, projectName + '.yaml'), replacedProject);
              return true;
            },
              path.join(gradleBasePath, 'java'), folderInto.fsPath, javaPackage + '.Main',
              path.join('frc', 'robot'))) {
              vscode.window.showErrorMessage('Cannot create into non empty folder');
              return false;
            }
          } else {
            if (!await generateCopyCpp(async () => {
              const projectName = path.basename(folderInto.fsPath);
              const replacedProject = yamlText.replace(new RegExp('###PACKAGEREPLACE###', 'g'), 'cpp')
                                              .replace(new RegExp('###PROJECTNAMEREPLACE###', 'g'), projectName);
              await promisifyWriteFile(path.join(folderInto.fsPath, projectName + 'yaml'), replacedProject);
              return true;
            },
              path.join(gradleBasePath, 'cpp'), folderInto.fsPath, false)) {
              vscode.window.showErrorMessage('Cannot create into non empty folder');
              return false;
            }
          }
        } catch (err) {
          logger.error('Example generation error: ', err);
          return false;
        }
        return true;
      },
    };
    core.addExampleProvider(provider);
  }
}
