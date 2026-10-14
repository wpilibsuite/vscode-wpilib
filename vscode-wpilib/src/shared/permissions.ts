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
export async function setWritableRecursive(path: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }

  const stat = await fs.promises.stat(path);
  if (stat.isFile()) {
    await fs.promises.chmod(path, stat.mode | fs.constants.S_IWUSR);
    return;
  }
  
  const entries = await fs.promises.readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(path, entry.name);
    if (entry.isDirectory()) {
      await setWritableRecursive(fullPath);
    }

    if (!entry.isFile()) {
      return;
    }
    const stat = await fs.promises.stat(fullPath);
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
