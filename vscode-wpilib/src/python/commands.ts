'use strict';
import { copyFile, readFile } from 'fs/promises';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from '../api';
import { logger } from '../logger';
import { getClassName } from '../utilities';
import * as fileUtils from '../shared/fileUtils';

export interface IPythonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  replacename: string;
}

async function performCopy(
  commandRoot: string,
  command: IPythonLayout,
  folder: vscode.Uri,
  replaceName: string
): Promise<boolean> {
  try {
    const renamedCommand = path.join(folder.fsPath, `${replaceName}.py`);
    await copyFile(
      path.join(commandRoot, command.foldername, `${command.replacename}.py`),
      renamedCommand
    );

    const replacements = new Map<RegExp, string>();
    replacements.set(new RegExp(command.replacename, 'g'), replaceName);

    await fileUtils.processFile(renamedCommand, replacements);

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(renamedCommand));
    await vscode.window.showTextDocument(document);
    return true;
  } catch (error) {
    logger.error('Error performing copy operation:', error);
    return false;
  }
}

const commandResourceName = 'commands.json';

export async function registerCommandTemplates(
  resourceRoot: string,
  core: ICommandAPI,
  preferences: IPreferencesAPI
) {
  const commandFolder = path.join(resourceRoot, 'commands');
  const resourceFile = path.join(commandFolder, commandResourceName);
  try {
    const data = await readFile(resourceFile, 'utf8');
    const commands: IPythonLayout[] = jsonc.parse(data) as IPythonLayout[];
    for (const c of commands) {
      const provider: ICommandCreator = {
        getLanguage(): string {
          return 'python';
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
          return currentLanguage === 'none' || currentLanguage === 'python';
        },
        async generate(folder: vscode.Uri): Promise<boolean> {
          const className = await getClassName();

          if (!className) {
            return false;
          }

          return performCopy(commandFolder, c, folder, className);
        },
      };
      core.addCommandProvider(provider);
    }
  } catch (err) {
    logger.log('Command error: ', err);
  }
}
