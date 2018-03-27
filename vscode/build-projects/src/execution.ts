import * as cp from 'child_process';
import { CancellationToken } from './util';

export interface IOptions {
  cwd?: string;
  stdio?: any;
  customFds?: any;
  env?: any;
  timeout?: number;
  maxBuffer?: number;
  killSignal?: string;
}

export function parseStdout({ stdout }: { stdout: string }): string {
  return stdout.split(/[\r\n]/).filter(line => !!line)[0];
}

export function exec(command: string, options: IOptions = {}, cancellationToken?: CancellationToken): Promise<{ stdout: string; stderr: string; }> {
  if (options.cwd !== undefined) {
    console.log(`running ${command} at ${options.cwd}`);
  } else {
    console.log(`running ${command}`);
  }
  return new Promise((c, e) => {
    let disposeCancellationListener: Function | undefined = undefined;

    const child = cp.exec(command, { ...options, encoding: 'utf8' } as any, (err, stdout: string, stderr: string) => {
      if (disposeCancellationListener !== undefined) {
        disposeCancellationListener();
        disposeCancellationListener = undefined;
      }

      if (err) { return e(err); }
      c({ stdout, stderr });
      if (options.cwd !== undefined) {
        console.log(`finished ${command} at ${options.cwd}`);
      } else {
        console.log(`finished ${command}`);
      }
    });

    if (cancellationToken) {
      disposeCancellationListener = cancellationToken.subscribe((err: any) => {
        child.kill();
        e(err);
      });
    }
  });
}
