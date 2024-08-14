'use scrict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import { existsAsync, extensionContext, statAsync, readdirAsync, readFileAsync } from '../utilities';
import * as vscode from '../vscodeshim';
import { IExampleTemplateAPI, IExampleTemplateCreator, IUtilitiesAPI } from '../wpilibapishim';
import { generateCopyCpp, generateCopyJava } from './generator';
import { VendorLibrariesBase } from './vendorlibrariesbase';

interface IJsonExample {
  name: string;
  description: string;
  tags: string[];
  gradlebase: string;
  language: "java" | "cpp";
  commandversion: number;
  mainclass?: string | undefined;
  packagetoreplace?: string | undefined;
  dependencies: string[];
  foldername: string;
  extravendordeps?: string[];
}

function isJsonExample(arg: unknown): arg is IJsonExample {
  const jsonDep = arg as IJsonExample;

  return jsonDep.name !== undefined && jsonDep.description !== undefined
    && jsonDep.gradlebase !== undefined && jsonDep.dependencies !== undefined
    && jsonDep.foldername !== undefined && jsonDep.language !== undefined;
}

export async function addVendorExamples(resourceRoot: string, core: IExampleTemplateAPI, utilities: IUtilitiesAPI,
                                        vendorlibs: VendorLibrariesBase): Promise<void> {
  const shimmedResourceRoot = path.join(resourceRoot, 'vendordeps');
  const storagePath = extensionContext.storagePath;
  if (storagePath === undefined) {
    return;
  }
  const exampleDir = path.join(utilities.getWPILibHomeDir(), 'vendorexamples');
  const gradleBasePath = path.join(resourceRoot, 'gradle');
  if (await existsAsync(exampleDir)) {
    const files = await readdirAsync(exampleDir);
    for (const file of files) {
      const filePath = path.join(exampleDir, file);
      if ((await statAsync(filePath)).isDirectory()) {
        continue;
      }
      const fileContents = await readFileAsync(filePath, 'utf8');
      const parsed = jsonc.parse(fileContents);
      if (Array.isArray(parsed)) {
        for (const ex of parsed) {
          if (isJsonExample(ex)) {
            if (ex.language !== 'java' && ex.language !== 'cpp') {
              // Only handle java and cpp
              continue;
            }
            const extraVendordeps: string[] = (ex.extravendordeps !== undefined) ? ex.extravendordeps : [];
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
                    if (!await generateCopyJava(shimmedResourceRoot, path.join(exampleDir, ex.foldername), undefined,
                      path.join(gradleBasePath, ex.gradlebase), folderInto.fsPath, 'frc.robot.' + ex.mainclass,
                      path.join('frc', 'robot'), false, extraVendordeps, ex.packagetoreplace)) {
                      vscode.window.showErrorMessage(i18n('message', 'Cannot create into non empty folder'));
                      return false;
                    }
                  } else {
                    if (!await generateCopyCpp(shimmedResourceRoot, path.join(exampleDir, ex.foldername), undefined,
                      path.join(gradleBasePath, ex.gradlebase), folderInto.fsPath, false, extraVendordeps)) {
                      vscode.window.showErrorMessage(i18n('message', 'Cannot create into non empty folder'));
                      return false;
                    }
                  }
                  const vendorFiles = await vendorlibs.findForUUIDs(ex.dependencies);
                  for (const vendorFile of vendorFiles) {
                    await vendorlibs.installDependency(vendorFile, vendorlibs.getVendorFolder(folderInto.fsPath), true);
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
