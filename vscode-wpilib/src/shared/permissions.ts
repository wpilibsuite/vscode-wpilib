'use strict';

import { S_IXGRP, S_IXOTH, S_IXUSR } from 'constants';
import { chmod, stat } from 'fs/promises';
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

  const stat = await fs.promises.stat(dir);
  if (stat.isFile()) {
    await fs.promises.chmod(dir, stat.mode | fs.constants.S_IWUSR);
    return;
  }
  
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await setWritableRecursive(fullPath);
    }

    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile) {
      return;
    }
    await fs.promises.chmod(fullPath, stat.mode | fs.constants.S_IWUSR);
  }
}

export async function setExecutePermissions(file: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  const stats = await stat(file);
  let mode = stats.mode & 0xffff;
  mode |= S_IXUSR | S_IXGRP | S_IXOTH;
  await chmod(file, mode);
}
