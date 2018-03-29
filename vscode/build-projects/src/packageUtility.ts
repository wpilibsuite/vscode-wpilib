import { exec } from './execution';
import { resolveAllPromises, IRunResult } from './util';
import { runBase } from './run';

export async function runInstall(directories: string[], windows: boolean, mac: boolean, linux: boolean): Promise<IRunResult[]> {
  let windowsArr: IRunResult[] = [];
  let macArr: IRunResult[] = [];
  let linuxArr: IRunResult[] = [];
  if (windows) {
    windowsArr = await runBase('npm run packageWindows', directories);
  }
  if (linux) {
    if (process.platform === 'win32') {
      console.log('cannot build linux on windows, skipping');
    } else {
      linuxArr = await runBase('npm run packageLinux', directories);
    }
  }
  if (mac) {
    if (process.platform === 'win32') {
      console.log('cannot build mac on windows, skipping');
    } else {
      macArr = await runBase('npm run packageMac', directories);
    }
  }
  return windowsArr.concat(macArr, linuxArr);
}
