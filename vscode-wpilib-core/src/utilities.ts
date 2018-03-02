'use strict';
import * as fs from 'fs';

export function getIsWindows(): boolean {
  let nodePlatform: NodeJS.Platform = process.platform;
  return nodePlatform === 'win32';
}

export function loadFileToString(file: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    fs.readFile(file, 'utf8', (error : NodeJS.ErrnoException, result : string) => {
        if (error) {
        reject(error);
        } else {
        resolve(result);
        }
    });
  });
}

export function writeStringToFile(file: string, data: string): Promise<void> {
  return new Promise(function (resolve, reject) {
    fs.writeFile(file, data, (error : NodeJS.ErrnoException) => {
      if (error) {
      reject(error);
      } else {
      resolve();
      }
    });
  });
}
