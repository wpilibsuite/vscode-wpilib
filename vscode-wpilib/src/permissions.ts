'use strict';

import * as fs from 'fs';
import { getIsWindows } from './utilities';

export function setExecutePermissions(file: string): Promise<void> {
  if (getIsWindows()) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        // tslint:disable-next-line:no-bitwise
        let mode = stat.mode & 0xFFFF;
        // tslint:disable-next-line:no-bitwise
        mode |= fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH;
        fs.chmod(file, mode, (err2) => {
          if (err2) {
            reject(err2);
          } else {
            resolve();
          }
        });
      }
    });
  });
}
