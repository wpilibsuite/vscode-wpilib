'use strict';

import { readdir, readFile, stat } from 'fs/promises';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExampleTemplateAPI, IExampleTemplateCreator, IUtilitiesAPI } from '../api';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import { extensionContext } from '../utilities';
import { generateCopyCpp, generateCopyJava } from './generator';
import { VendorLibrariesBase } from './vendorlibrariesbase';

interface IJsonExample {
  name: string;
  description: string;
  tags: string[];
  gradlebase: string;
  language: 'java' | 'cpp';
  commandversion: number;
  mainclass?: string | undefined;
  packagetoreplace?: string | undefined;
  dependencies: string[];
  foldername: string;
  extravendordeps?: string[];
}

function isJsonExample(arg: unknown): arg is IJsonExample {
  const jsonDep = arg as IJsonExample;

  return (
    jsonDep.name !== undefined &&
    jsonDep.description !== undefined &&
    jsonDep.gradlebase !== undefined &&
    jsonDep.dependencies !== undefined &&
    jsonDep.foldername !== undefined &&
    jsonDep.language !== undefined
  );
}

export async function addVendorExamples(
  resourceRoot: string,
  core: IExampleTemplateAPI,
  utilities: IUtilitiesAPI,
  vendorlibs: VendorLibrariesBase
): Promise<void> {
  const shimmedResourceRoot = path.join(resourceRoot, 'vendordeps');
  const storagePath = extensionContext.storagePath;
  if (storagePath === undefined) {
    return;
  }

  const exampleDir = path.join(utilities.getWPILibHomeDir(), 'vendorexamples');
  const gradleBasePath = path.join(resourceRoot, 'gradle');

  try {
    const files = await readdir(exampleDir);
    for (const file of files) {
      const filePath = path.join(exampleDir, file);
      if ((await stat(filePath)).isDirectory()) {
        continue;
      }

      try {
        const fileContents = await readFile(filePath, 'utf8');
        const parsed = jsonc.parse(fileContents);

        if (!Array.isArray(parsed)) {
          logger.log('file not array', fileContents);
          break;
        }
        for (const ex of parsed) {
          if (!isJsonExample(ex)) {
            logger.log('item not example', ex);
            continue;
          }
          if (ex.language !== 'java' && ex.language !== 'cpp') {
            // Only handle java and cpp
            continue;
          }

          const extraVendordeps: string[] =
            ex.extravendordeps !== undefined ? ex.extravendordeps : [];
          const provider: IExampleTemplateCreator = {
            getLanguage(): string {
              return ex.language;
            },
            getDescription(): string {
              return ex.description;
            },
            getDisplayName(): string {
              return ex.name;
            },
            async generate(folderInto: vscode.Uri): Promise<boolean> {
              try {
                const exampleFolderPath = path.join(exampleDir, ex.foldername);
                const gradlePath = path.join(gradleBasePath, ex.gradlebase);

                if (ex.language === 'java') {
                  if (
                    !(await generateCopyJava(
                      shimmedResourceRoot,
                      exampleFolderPath,
                      undefined,
                      gradlePath,
                      folderInto.fsPath,
                      'frc.robot.' + ex.mainclass,
                      path.join('frc', 'robot'),
                      false,
                      extraVendordeps,
                      ex.packagetoreplace
                    ))
                  ) {
                    vscode.window.showErrorMessage(
                      i18n('message', 'Cannot create into non empty folder')
                    );
                    return false;
                  }
                } else {
                  if (
                    !(await generateCopyCpp(
                      shimmedResourceRoot,
                      exampleFolderPath,
                      undefined,
                      gradlePath,
                      folderInto.fsPath,
                      false,
                      extraVendordeps
                    ))
                  ) {
                    vscode.window.showErrorMessage(
                      i18n('message', 'Cannot create into non empty folder')
                    );
                    return false;
                  }
                }

                // Install vendor dependencies
                const vendorFiles = await vendorlibs.findForUUIDs(ex.dependencies);
                const vendorFolder = path.join(folderInto.fsPath, 'vendordeps');

                for (const vendorFile of vendorFiles) {
                  await vendorlibs.installDependency(vendorFile, vendorFolder, true);
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
      } catch (error) {
        logger.error(`Error processing vendor example file: ${filePath}`, error);
      }
    }
  } catch {
    logger.log('no vendor examples found', exampleDir);
  }
}
