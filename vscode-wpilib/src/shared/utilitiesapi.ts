'use strict';

import * as os from 'os';
import * as path from 'path';
import { IUtilitiesAPI } from '../api';

export function getWPILibYear(): string {
  return '2027_alpha7';
}

let wpilibHome: string | undefined;

export function getWPILibHomeDirForPlatform(
  platform: NodeJS.Platform,
  homeDir: string,
  env: NodeJS.ProcessEnv
): string {
  const year = getWPILibYear();
  if (platform === 'win32') {
    let publicFolder = env.PUBLIC;
    if (!publicFolder) {
      publicFolder = 'C:\\Users\\Public';
    }
    return path.join(publicFolder, 'wpilib', year);
  }

  if (platform === 'linux') {
    const dataHome = env.XDG_DATA_HOME;
    if (dataHome && dataHome.trim().length > 0) {
      return path.join(dataHome, '.wpilib', year);
    }
    return path.join(homeDir, '.local', 'share', '.wpilib', year);
  }

  return path.join(homeDir, '.wpilib', year);
}

export function getWPILibHomeDir(): string {
  if (wpilibHome) {
    return wpilibHome;
  }
  wpilibHome = getWPILibHomeDirForPlatform(process.platform, os.homedir(), process.env);
  return wpilibHome;
}

export class UtilitiesAPI implements IUtilitiesAPI {
  public getWPILibYear(): string {
    return getWPILibYear();
  }
  public getWPILibHomeDir(): string {
    return getWPILibHomeDir();
  }
}
