'use strict';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from 'vscode-wpilibapi';
import { logger } from '../logger';
import { getClassName, ncpAsync } from '../utilities';

export interface ICppJsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  headers: string[];
  source: string[];
  replacename: string;
}

async function performCopy(commandRoot: string, command: ICppJsonLayout, folderSrc: vscode.Uri,
                           folderHeader: vscode.Uri, includeRoot: vscode.Uri, replaceName: string): Promise<boolean> {
  const commandFolder = path.join(commandRoot, command.foldername);
  const copiedSrcFiles: string[] = [];
  const copiedHeaderFiles: string[] = [];
  await ncpAsync(commandFolder, folderSrc.fsPath, {
    filter: (cf: string): boolean => {
      if (!fs.lstatSync(cf).isFile()) {
        return true;
      }
      const bn = path.basename(cf);
      if (command.source.indexOf(bn) > -1) {
        copiedSrcFiles.push(path.relative(commandFolder, cf));
        return true;
      } else {
        return false;
      }
    },
  });

  await ncpAsync(commandFolder, folderHeader.fsPath, {
    filter: (cf: string): boolean => {
      if (!fs.lstatSync(cf).isFile()) {
        return true;
      }
      const bn = path.basename(cf);
      if (command.headers.indexOf(bn) > -1) {
        copiedHeaderFiles.push(path.relative(commandFolder, cf));
        return true;
      } else {
        return false;
      }
    },
  });

  let promiseArray: Array<Promise<void>> = [];

  for (const f of copiedHeaderFiles) {
    const file = path.join(folderHeader.fsPath, f);
    promiseArray.push(new Promise<void>((resolve, reject) => {
      fs.readFile(file, 'utf8', (err, dataIn) => {
        if (err) {
          reject(err);
        } else {
          const dataOut = dataIn.replace(new RegExp(command.replacename, 'g'), replaceName);
          fs.writeFile(file, dataOut, 'utf8', (err1) => {
            if (err1) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    }));
  }

  await Promise.all(promiseArray);

  promiseArray = [];

  for (const f of copiedSrcFiles) {
    const file = path.join(folderSrc.fsPath, f);
    promiseArray.push(new Promise<void>((resolve, reject) => {
      fs.readFile(file, 'utf8', (err, dataIn) => {
        if (err) {
          reject(err);
        } else {
          const joinedName = path.join(path.relative(includeRoot.path, folderHeader.path), replaceName).replace(/\\/g, '/');

          const dataOut = dataIn.replace(new RegExp(`#include "${command.replacename}.h"`, 'g'), `#include "${joinedName}.h"`)
            .replace(new RegExp(command.replacename, 'g'), replaceName);

          fs.writeFile(file, dataOut, 'utf8', (err1) => {
            if (err1) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    }));
  }

  await Promise.all(promiseArray);

  let movePromiseArray: Array<Promise<void>> = [];
  for (const f of copiedSrcFiles) {
    const file = path.join(folderSrc.fsPath, f);
    const bname = path.basename(file);
    const dirname = path.dirname(file);
    if (path.basename(file).indexOf(command.replacename) > -1) {
      const newname = path.join(dirname, bname.replace(new RegExp(command.replacename, 'g'), replaceName));
      movePromiseArray.push(new Promise<void>((resolve, reject) => {
        fs.rename(file, newname, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }));
    }
  }

  if (movePromiseArray.length > 0) {
    await Promise.all(movePromiseArray);
  }

  movePromiseArray = [];
  for (const f of copiedHeaderFiles) {
    const file = path.join(folderHeader.fsPath, f);
    const bname = path.basename(file);
    const dirname = path.dirname(file);
    if (path.basename(file).indexOf(command.replacename) > -1) {
      const newname = path.join(dirname, bname.replace(new RegExp(command.replacename, 'g'), replaceName));
      movePromiseArray.push(new Promise<void>((resolve, reject) => {
        fs.rename(file, newname, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }));
    }
  }

  if (movePromiseArray.length > 0) {
    await Promise.all(movePromiseArray);
  }

  return true;
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

            const workspaceRooted = path.relative(path.join(workspace.uri.path, 'src', 'main'), folder.path);

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
              srcFolder = vscode.Uri.file(path.join(workspace.uri.path, 'src', 'main', 'cpp', filePath));
              headerFolder = vscode.Uri.file(path.join(workspace.uri.path, 'src', 'main', 'include', filePath));
              includeRoot = vscode.Uri.file(path.join(workspace.uri.path, 'src', 'main', 'include'));
              // Current folder is src

            } else {
              const filePath = path.relative('include', workspaceRooted);
              srcFolder = vscode.Uri.file(path.join(workspace.uri.path, 'src', 'main', 'cpp', filePath));
              headerFolder = vscode.Uri.file(path.join(workspace.uri.path, 'src', 'main', 'include', filePath));
              includeRoot = vscode.Uri.file(path.join(workspace.uri.path, 'src', 'main', 'include'));
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
