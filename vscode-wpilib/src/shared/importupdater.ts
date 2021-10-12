'use strict';

import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import * as glob from 'glob';
import * as path from 'path';
import { readFileAsync } from '../utilities';

interface IReplaceGroup {
  from: string;
  to: string;
}

interface IToUpdate {
  fileMatcher: string;
  flags: string;
  replacements: IReplaceGroup[];
}

export async function ImportUpdate(srcDir: string, updateFile: string): Promise<boolean> {
  const toUpdate = await readFileAsync(updateFile, 'utf8');
  const toUpdateParsed: IToUpdate[] = jsonc.parse(toUpdate) as IToUpdate[];

  // Enumerate through each updater
  for (const updater of toUpdateParsed) {
    const toUpdateFiles = await new Promise<string[]>((resolve, reject) => {
      glob(updater.fileMatcher, {
        cwd: srcDir,
        nodir: true,
        nomount: true,
      }, (err, matches) => {
        if (err) {
          reject(err);
        } else {
          resolve(matches);
        }
      });
    });

    const promiseArray: Promise<void>[] = [];

    for (const filePath of toUpdateFiles) {
      // Open each file, find its matches, update
      const file = path.join(srcDir, filePath);

      promiseArray.push(new Promise<void>((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, dataIn) => {
          if (err) {
            reject(err);
          } else {
            let dataOut = dataIn;
            for (const replace of updater.replacements) {
              dataOut = dataIn.replace(new RegExp(replace.from, updater.flags), replace.to);
            }
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
  }
  return true;
}
