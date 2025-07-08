'use strict';
import * as fs from 'fs';
import { cp } from 'fs/promises';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from '../api';
import { logger } from '../logger';
import { getClassName } from '../utilities';
import * as fileUtils from '../shared/fileUtils';

export interface ICppJsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  headers: string[];
  source: string[];
  replacename: string;
}

async function performCopy(
  commandRoot: string,
  command: ICppJsonLayout,
  folderSrc: vscode.Uri,
  folderHeader: vscode.Uri,
  includeRoot: vscode.Uri,
  replaceName: string
): Promise<boolean> {
  try {
    const commandFolder = path.join(commandRoot, command.foldername);

    const renamedHeader = path.join(folderHeader.fsPath, `${replaceName}.h`);
    const renamedSource = path.join(folderSrc.fsPath, `${replaceName}.cpp`);
    // The source and header arrays are always one item long
    await cp(path.join(commandFolder, command.source[0]), renamedHeader);
    await cp(path.join(commandFolder, command.headers[0]), renamedSource);

    // Process header files
    const headerReplacements = new Map<RegExp, string>();
    headerReplacements.set(new RegExp(command.replacename, 'g'), replaceName);

    await fileUtils.processFile(renamedHeader, folderHeader.fsPath, headerReplacements);
    // Process source files with more complex replacements
    const sourceReplacements = new Map<RegExp, string>();
    const joinedName = path
      .join(path.relative(includeRoot.path, folderHeader.path), replaceName)
      .replace(/\\/g, '/');

    sourceReplacements.set(
      new RegExp(`#include "${command.replacename}.h"`, 'g'),
      `#include "${joinedName}.h"`
    );
    sourceReplacements.set(new RegExp(command.replacename, 'g'), replaceName);

    await fileUtils.processFile(renamedSource, folderSrc.fsPath, sourceReplacements);
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
        logger.log('Command error: ', err);
        return;
      }
      const commands: ICppJsonLayout[] = jsonc.parse(data) as ICppJsonLayout[];
      for (const c of commands) {
        const provider: ICommandCreator = {
          getLanguage(): string {
            return 'cpp';
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
            return currentLanguage === 'none' || currentLanguage === 'cpp';
          },
          async generate(folder: vscode.Uri, workspace: vscode.WorkspaceFolder): Promise<boolean> {
            const className = await getClassName();

            if (className === undefined || className === '') {
              return false;
            }

            const workspaceRooted = path.relative(
              path.join(workspace.uri.path, 'src', 'main'),
              folder.path
            );

            // include root is /include
            // src root is /cpp
            const srcSearchString = 'cpp';
            const rootSrc = workspaceRooted.indexOf(srcSearchString);

            const includeSearchString = 'include';
            const rootInclude = workspaceRooted.indexOf(includeSearchString);

            let srcFolder = vscode.Uri.file('');
            let headerFolder = vscode.Uri.file('');
            let includeRoot = vscode.Uri.file('');

            if (rootInclude === rootSrc) {
              // Weird folder, put both in same directory
              srcFolder = folder;
              headerFolder = folder;
              includeRoot = folder;
            } else if (rootSrc === 0) {
              const filePath = path.relative('cpp', workspaceRooted);
              srcFolder = vscode.Uri.file(
                path.join(workspace.uri.path, 'src', 'main', 'cpp', filePath)
              );
              headerFolder = vscode.Uri.file(
                path.join(workspace.uri.path, 'src', 'main', 'include', filePath)
              );
              includeRoot = vscode.Uri.file(
                path.join(workspace.uri.path, 'src', 'main', 'include')
              );
              // Current folder is src
            } else {
              const filePath = path.relative('include', workspaceRooted);
              srcFolder = vscode.Uri.file(
                path.join(workspace.uri.path, 'src', 'main', 'cpp', filePath)
              );
              headerFolder = vscode.Uri.file(
                path.join(workspace.uri.path, 'src', 'main', 'include', filePath)
              );
              includeRoot = vscode.Uri.file(
                path.join(workspace.uri.path, 'src', 'main', 'include')
              );
              // current folder is include
            }
            return performCopy(commandFolder, c, srcFolder, headerFolder, includeRoot, className);
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
