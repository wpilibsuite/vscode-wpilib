'use string';

import * as os from 'os';
import * as path from 'path';
import { IUtilitiesAPI } from 'vscode-wpilibapi';
import { getIsWindows } from './utilities';

export class UtilitiesAPI implements IUtilitiesAPI {
  public getFrcYear(): string {
    return '2018';
  }
  public getWPILibHomeDir(): string {
    const year = this.getFrcYear();
    const frcHome = process.env[`FRC_${year}_HOME`];
    if (frcHome) {
      return frcHome;
    } else {
      if (getIsWindows()) {
        // Windows, search public home
        return '';
      } else {
        // Unix, search user home
        const dir = os.homedir();
        const wpilibhome = path.join(dir, `wpilib${year}`);
        return wpilibhome;
      }
    }
  }
}
