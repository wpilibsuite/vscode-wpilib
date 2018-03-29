import { IRunResult } from './util';
import { runBase } from './run';

export function runPackageVsCode(directories: string[]): Promise<IRunResult[]> {
  return runBase('npm run package', directories);
}
