'use strict';

import { chmod, constants, stat } from 'fs/promises';

export async function setExecutePermissions(file: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  const stats = await stat(file);
  let mode = stats.mode & 0xffff;
  mode |= constants.S_IXUSR | constants.S_IXGRP | constants.S_IXOTH;
  await chmod(file, mode);
}
