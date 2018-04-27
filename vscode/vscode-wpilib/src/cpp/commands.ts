'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { promisifyNcp } from '../shared/generator';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from '../shared/externalapi';

interface JsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  headers: string[];
  source: string[];
  replacename: string;
}

async function performCopy(commandRoot: string, command: JsonLayout, folderSrc: vscode.Uri, folderHeader: vscode.Uri, includeRoot: vscode.Uri, replaceName: string): Promise<boolean> {
  const commandFolder = path.join(commandRoot, command.foldername);
  const copiedSrcFiles: string[] = [];
  const copiedHeaderFiles: string[] = [];
  await promisifyNcp(commandFolder, folderSrc.fsPath, {
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
    }
  });

  await promisifyNcp(commandFolder, folderHeader.fsPath, {
    filter: (cf : string): boolean => {
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
    }
  });

  let promiseArray: Promise<void>[] = [];

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
          const dataOut = dataIn.replace(new RegExp(`#include "${command.replacename}.h"`, 'g'), `#include "${path.join(path.relative(includeRoot.path, folderHeader.path), replaceName)}.h"`)
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

  let movePromiseArray: Promise<void>[] = [];
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
        console.log(err);
        return;
      }
      const commands: JsonLayout[] = jsonc.parse(data);
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
            const prefs = await preferences.getPreferences(workspace);
            if (prefs === undefined) {
                console.log('Preferences without workspace?');
                return false;
            }
            const currentLanguage = prefs.getCurrentLanguage();
            return currentLanguage === 'none' || currentLanguage === 'cpp';
          },
          async generate(folder: vscode.Uri, workspace: vscode.WorkspaceFolder): Promise<boolean> {
            const className = await vscode.window.showInputBox({
              prompt: 'Please enter a class name'
            });

            if (className === undefined || className === '') {
              await vscode.window.showInformationMessage('Invalid class name entered');
              return false;
            }

            const workspaceRooted = path.relative(workspace.uri.path, folder.path);



            // include root is /include
            // src root is /src
            const srcSearchString = 'src';
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
              const filePath = path.relative('src', workspaceRooted);
              srcFolder = vscode.Uri.file(path.join(workspace.uri.path, 'src', filePath));
              headerFolder = vscode.Uri.file(path.join(workspace.uri.path, 'include', filePath));
              includeRoot = vscode.Uri.file(path.join(workspace.uri.path, 'include'));
              // Current folder is src

            } else {
              const filePath = path.relative('include', workspaceRooted);
              srcFolder = vscode.Uri.file(path.join(workspace.uri.path, 'src', filePath));
              headerFolder = vscode.Uri.file(path.join(workspace.uri.path, 'include', filePath));
              includeRoot = vscode.Uri.file(path.join(workspace.uri.path, 'include'));
              // current folder is include
            }
            return await performCopy(commandFolder, c, srcFolder, headerFolder, includeRoot, className);
          }
        };
        core.addCommandProvider(provider);
      }
    });
  }

  public dispose() {

  }
}
