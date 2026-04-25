'use strict';

import * as os from 'os';
import * as path from 'path';
import { IUtilitiesAPI } from '../api';
import { getIsWindows } from '../utilities';

export function getWPILibYear(): string {
  return '2027_alpha4';
}

let wpilibHome: string | undefined;

export function getWPILibHomeDir(): string {
  if (wpilibHome) {
    return wpilibHome;
  }
  const year = getWPILibYear();
  if (getIsWindows()) {
    let publicFolder = process.env.PUBLIC;
    if (!publicFolder) {
      publicFolder = 'C:\\Users\\Public';
    }
    wpilibHome = path.join(publicFolder, 'wpilib', year);
  } else {
    const dir = os.homedir();
    wpilibHome = path.join(dir, 'wpilib', year);
  }
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
