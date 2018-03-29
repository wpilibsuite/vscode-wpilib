import { IRunResult } from './util';
import { runBase } from './run';

export function runCompile(directories: string[]): Promise<IRunResult[]> {
  return runBase('npm run compile', directories);
}
