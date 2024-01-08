'use strict';

import * as fs from 'fs';

export function setExecutePermissions(file: string): Promise<void> {
  if (process.platform === 'win32') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        let mode = stat.mode & 0xFFFF;
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
