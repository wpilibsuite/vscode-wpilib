'use strict';

import { S_IXGRP, S_IXOTH, S_IXUSR } from 'constants';
import { chmod, stat, constants, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Recursively ensures all files and directories under `dir` are
 * owner-writable. This is needed when copying from read-only
 * filesystems (e.g. the Nix store) where copied files preserve
 * the source's read-only permissions.
 */
export async function setWritableRecursive(path: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }

  const fileStat = await stat(path);
  if (fileStat.isFile()) {
    await chmod(path, fileStat.mode | constants.S_IWUSR);
    return;
  }
  
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      await setWritableRecursive(fullPath);
    }

    if (!entry.isFile()) {
      return;
    }
    const fileStat = await stat(fullPath);
    await chmod(fullPath, fileStat.mode | constants.S_IWUSR);
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
