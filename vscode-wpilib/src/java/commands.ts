'use strict';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from '../api';
import { logger } from '../logger';
import { getClassName, getPackageName } from '../utilities';
import * as fileUtils from '../shared/fileUtils';

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
    const commandFolder = path.join(commandRoot, command.foldername);

    // Copy files and track them
    const copiedFiles = await fileUtils.copyAndReturnFiles(commandFolder, folder.fsPath);

    // Create replacements map
    const replacements = new Map<RegExp, string>();

    // Add package replacement
    replacements.set(/edu\.wpi\.first\.wpilibj\.(?:commands)\..+?(?=;|\.)/g, javaPackage);

    // Add classname replacement
    replacements.set(new RegExp(command.replacename, 'g'), replaceName);

    // Process files with replacements
    await Promise.all(
      copiedFiles.map(async (file) => fileUtils.processFile(file, folder.fsPath, replacements))
    );
    // Rename files
    const renamedFiles = await fileUtils.renameFiles(
      copiedFiles,
      folder.fsPath,
      command.replacename,
      replaceName
    );

    for (const file of renamedFiles) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
      await vscode.window.showTextDocument(document);
    }
    return true;
  } catch (error) {
    logger.error('Error performing copy operation:', error);
    return false;
  }
}

export class Commands {
  private readonly commandResourceName = 'commands.json';

  constructor(resourceRoot: string, core: ICommandAPI, preferences: IPreferencesAPI) {
    const commandFolder = path.join(resourceRoot, 'src', 'commands');
    const resourceFile = path.join(commandFolder, this.commandResourceName);
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
