'use strict';

import { S_IXGRP, S_IXOTH, S_IXUSR } from 'constants';
import { chmod, stat } from 'fs/promises';

export async function setExecutePermissions(file: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  let stats = await stat(file);
  let mode = stats.mode & 0xffff;
  mode |= S_IXUSR | S_IXGRP | S_IXOTH;
  await chmod(file, mode);
}
