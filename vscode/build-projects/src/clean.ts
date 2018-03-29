import { exec } from './execution';
import { resolveAllPromises, IRunResult } from './util';
import { runBase } from './run';

export function runClean(directories: string[]): Promise<IRunResult[]> {
  return runBase('npm run clean', directories);
}
