'use strict';

import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively ensures all files and directories under `dir` are
 * owner-writable. This is needed when copying from read-only
 * filesystems (e.g. the Nix store) where copied files preserve
 * the source's read-only permissions.
 */
export async function setWritableRecursive(dir: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await setWritableRecursive(fullPath);
    }
    const stat = await fs.promises.stat(fullPath);
    await fs.promises.chmod(fullPath, stat.mode | fs.constants.S_IWUSR);
  }
}

export function setExecutePermissions(file: string): Promise<void> {
  if (process.platform === 'win32') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        let mode = stat.mode & 0xffff;
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
