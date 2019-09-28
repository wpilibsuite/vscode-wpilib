'use scrict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import { existsAsync, extensionContext, mkdirpAsync, readdirAsync, readFileAsync, writeFileAsync } from '../utilities';
import * as vscode from '../vscodeshim';
import { IExampleTemplateAPI, IExampleTemplateCreator, IUtilitiesAPI } from '../wpilibapishim';
import { generateCopyCpp, generateCopyJava } from './generator';
import { VendorLibrariesBase } from './vendorlibrariesbase';

export interface IFile {
  deployloc: string;
  contents: string;
}

interface IJsonExample {
  name: string;
  description: string;
  gradlebase: string;
  language: string;
  mainclass?: string | undefined;
  packagetoreplace?: string | undefined;
  dependencies: string[];
  files: IFile[];
}

// tslint:disable-next-line:no-any
function isJsonExample(arg: any): arg is IJsonExample {
  const jsonDep = arg as IJsonExample;

  return jsonDep.name !== undefined && jsonDep.description !== undefined
    && jsonDep.gradlebase !== undefined && jsonDep.dependencies !== undefined
    && jsonDep.files !== undefined && jsonDep.language !== undefined;
}

export async function addVendorExamples(resourceRoot: string, core: IExampleTemplateAPI, utilities: IUtilitiesAPI,
                                        vendorlibs: VendorLibrariesBase): Promise<void> {
  const storagePath = extensionContext.storagePath;
  if (storagePath === undefined) {
    return;
  }
  const exampleDir = path.join(utilities.getWPILibHomeDir(), 'vendorexamples');
  const gradleBasePath = path.join(resourceRoot, 'gradle');
  if (await existsAsync(exampleDir)) {
    const files = await readdirAsync(exampleDir);
    for (const file of files) {
      const fileContents = await readFileAsync(path.join(exampleDir, file), 'utf8');
      const parsed = jsonc.parse(fileContents);
      if (Array.isArray(parsed)) {
        for (const ex of parsed) {
          if (isJsonExample(ex)) {
            if (ex.language !== 'java' && ex.language !== 'cpp') {
              // Only handle java and cpp
              continue;
            }
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
                  if (ex.language === 'java') {
                    if (!await generateCopyJava(async (copyPath, rootDir) => {
                      for (const copyFile of ex.files) {
                        const copyFilePath = path.join(copyPath, copyFile.deployloc);
                        const copyParent = path.dirname(copyFilePath);
                        await mkdirpAsync(copyParent);
                        await writeFileAsync(copyFilePath, copyFile.contents);
                      }
                      const vendorFiles = await vendorlibs.findForUUIDs(ex.dependencies);
                      for (const vendorFile of vendorFiles) {
                        await vendorlibs.installDependency(vendorFile, vendorlibs.getVendorFolder(rootDir), true);
                      }
                      return true;
                    },
                      path.join(gradleBasePath, ex.gradlebase), folderInto.fsPath, 'frc.robot.' + ex.mainclass,
                      path.join('frc', 'robot'), ex.packagetoreplace)) {
                      vscode.window.showErrorMessage(i18n('message', 'Cannot create into non empty folder'));
                      return false;
                    }
                  } else {
                    if (!await generateCopyCpp(async (copyPath, rootDir) => {
                      for (const copyFile of ex.files) {
                        const copyFilePath = path.join(copyPath, copyFile.deployloc);
                        const copyParent = path.dirname(copyFilePath);
                        await mkdirpAsync(copyParent);
                        await writeFileAsync(copyFilePath, copyFile.contents);
                      }
                      const vendorFiles = await vendorlibs.findForUUIDs(ex.dependencies);
                      for (const vendorFile of vendorFiles) {
                        await vendorlibs.installDependency(vendorFile, vendorlibs.getVendorFolder(rootDir), true);
                      }
                      return true;
                    },
                      path.join(gradleBasePath, ex.gradlebase), folderInto.fsPath, false)) {
                      vscode.window.showErrorMessage(i18n('message', 'Cannot create into non empty folder'));
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
          } else {
            logger.log('item not example', ex);
          }
        }
      } else {
        logger.log('file not array', fileContents);
      }
    }
  } else {
    logger.log('no vendor examples found', exampleDir);
  }
}
