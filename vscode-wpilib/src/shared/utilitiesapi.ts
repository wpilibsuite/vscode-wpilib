'use strict';

import * as os from 'os';
import * as path from 'path';
import { getIsWindows } from '../utilities';
import { IUtilitiesAPI } from '../wpilibapishim';

export class UtilitiesAPI implements IUtilitiesAPI {
  private wpilibHome: string | undefined;

  public getFrcYear(): string {
    return '2025';
  }
  public getWPILibHomeDir(): string {
    if (this.wpilibHome) {
      return this.wpilibHome;
    }
    const year = this.getFrcYear();
    if (getIsWindows()) {
      let publicFolder = process.env.PUBLIC;
      if (!publicFolder) {
        publicFolder = 'C:\\Users\\Public';
      }
      this.wpilibHome = path.join(publicFolder, 'wpilib', year);
    } else {
      const dir = os.homedir();
      this.wpilibHome = path.join(dir, 'wpilib', year);
    }
    return this.wpilibHome;
  }
}
