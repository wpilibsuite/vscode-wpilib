'use strict';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICommandAPI, ICommandCreator, IPreferencesAPI } from 'vscode-wpilibapi';
import { logger } from '../logger';
import { promisifyNcp } from '../shared/generator';
import { getClassName, getPackageName } from '../utilities';

export interface IJavaJsonLayout {
  name: string;
  description: string;
  tags: string[];
  foldername: string;
  replacename: string;
}

async function performCopy(commandRoot: string, command: IJavaJsonLayout, folder: vscode.Uri, replaceName: string,
                           javaPackage: string): Promise<boolean> {
  const commandFolder = path.join(commandRoot, command.foldername);
  const copiedFiles: string[] = [];
  await promisifyNcp(commandFolder, folder.fsPath, {
    filter: (cf: string): boolean => {
      if (fs.lstatSync(cf).isFile()) {
        copiedFiles.push(path.relative(commandFolder, cf));
      }
      return true;
    },
  });

  const replacePackageFrom = 'edu\\.wpi\\.first\\.wpilibj\\.(?:commands)\\..+?(?=;|\\.)';
  const replacePackageTo = javaPackage;

  const promiseArray: Array<Promise<void>> = [];

  for (const f of copiedFiles) {
    const file = path.join(folder.fsPath, f);
    promiseArray.push(new Promise<void>((resolve, reject) => {
      fs.readFile(file, 'utf8', (err, dataIn) => {
        if (err) {
          reject(err);
        } else {
          const dataOut = dataIn.replace(new RegExp(replacePackageFrom, 'g'), replacePackageTo)
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

  const movePromiseArray: Array<Promise<string>> = [];
  for (const f of copiedFiles) {
    const file = path.join(folder.fsPath, f);
    const bname = path.basename(file);
    const dirname = path.dirname(file);
    if (path.basename(file).indexOf(command.replacename) > -1) {
      const newname = path.join(dirname, bname.replace(new RegExp(command.replacename, 'g'), replaceName));
      movePromiseArray.push(new Promise<string>((resolve, reject) => {
        fs.rename(file, newname, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(newname);
          }
        });
      }));
    }
  }

  if (movePromiseArray.length > 0) {
    const renamedCopiedFiles = await Promise.all(movePromiseArray);
    for (const file of renamedCopiedFiles) {
      const uri = vscode.Uri.file(file);
      try {
        const td = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(td);
      } catch (err) {
        logger.warn('Failed to open copied file: ' + file, err);
      }
    }
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
        logger.log(JSON.stringify(err, null, 4));
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
              // Coult not root path, ask for one
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
