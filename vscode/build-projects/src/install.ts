import { IRunResult } from './util';
import { runBase } from './run';

export function runInstall(directories: string[]): Promise<IRunResult[]> {
  return runBase('npm install', directories);
}
