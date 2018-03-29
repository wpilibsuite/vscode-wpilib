import { exec } from './execution';
import { IRunResult } from './util';

export async function runBase(command: string, directories: string[]): Promise<IRunResult[]> {
  const finishedArray: IRunResult[] = [];

  for (const d of directories) {
    try {
      const res = await exec(command, {
        cwd: d
      });
      finishedArray.push({command: d, stdout: res.stdout, stderr: res.stderr, err: undefined, success: true});
    } catch (err) {
      finishedArray.push({command: d, stdout: undefined, stderr: undefined, err: err, success: false});
    }
  }

  return finishedArray;
}
