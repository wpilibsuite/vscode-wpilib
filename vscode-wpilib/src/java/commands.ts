'use strict';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from 'vscode-wpilibapi';
import { logger } from '../logger';
import { getClassName, getPackageName } from '../utilities';
import * as pathUtils from '../utils/project/pathUtils';
import * as fileUtils from '../utils/project/fileUtils';

export interface IJavaJsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  replacename: string;
}

async function performCopy(
  commandRoot: string,
  command: IJavaJsonLayout,
  folder: vscode.Uri,
  replaceName: string,
  javaPackage: string
): Promise<boolean> {
  try {
    const commandFolder = pathUtils.joinPath(commandRoot, command.foldername);

    // Copy files and track them
    const copiedFiles = await fileUtils.copyFiles(
      commandFolder,
      folder.fsPath,
      undefined, // No filter needed for Java
      true // Track copied files
    );

    // Create replacements map
    const replacements = new Map<string | RegExp, string>();

    // Add package replacement
    const replacePackageFrom = 'edu\\.wpi\\.first\\.wpilibj\\.(?:commands)\\..+?(?=;|\\.)';
    replacements.set(new RegExp(replacePackageFrom, 'g'), javaPackage);

    // Add classname replacement
    replacements.set(new RegExp(command.replacename, 'g'), replaceName);

    // Process files with replacements
    await fileUtils.processFiles(copiedFiles, folder.fsPath, replacements);

    // Rename files
    await fileUtils.renameFiles(
      copiedFiles,
      folder.fsPath,
      command.replacename,
      replaceName,
      true // Open in editor
    );

    return true;
  } catch (error) {
    logger.error('Error performing copy operation:', error);
    return false;
  }
}

export class Commands {
  private readonly commandResourceName = 'commands.json';

  constructor(resourceRoot: string, core: ICommandAPI, preferences: IPreferencesAPI) {
    const commandFolder = pathUtils.joinPath(resourceRoot, 'src', 'commands');
    const resourceFile = pathUtils.joinPath(commandFolder, this.commandResourceName);

    fs.readFile(resourceFile, 'utf8', (err, data) => {
      if (err) {
        logger.error('Command file error: ', err);
        return;
      }

      const commands: IJavaJsonLayout[] = jsonc.parse(data) as IJavaJsonLayout[];

      for (const c of commands) {
        const provider: ICommandCreator = {
          getLanguage(): string {
            return 'java';
          },
          getDescription(): string {
            return c.description;
          },
          getDisplayName(): string {
            return c.name;
          },
          async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
            const prefs = preferences.getPreferences(workspace);
            const currentLanguage = prefs.getCurrentLanguage();
            return currentLanguage === 'none' || currentLanguage === 'java';
          },
          async generate(folder: vscode.Uri): Promise<boolean> {
            // root is src/main/java
            const folderpath = folder.path;
            const searchString = '/src/main/java';
            const rootIndex = folderpath.lastIndexOf(searchString);

            let javaPackage = '';

            if (rootIndex !== -1) {
              const packageslash = folderpath.substring(rootIndex + searchString.length);
              if (packageslash.length !== 0) {
                javaPackage = packageslash.substring(1).replace(/\//g, '.');
              }
              logger.log(packageslash);
            } else {
              // Could not root path, ask for one
              const res = await getPackageName();
              if (res === undefined) {
                return false;
              }
              javaPackage = res;
            }

            const className = await getClassName();

            if (className === undefined || className === '') {
              return false;
            }

            return performCopy(commandFolder, c, folder, className, javaPackage);
          },
        };

        core.addCommandProvider(provider);
      }
    });
  }

  public dispose() {
    //
  }
}
