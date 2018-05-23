/*
'use strict';
import * as vscode from 'vscode';
import { PromiseCondition } from './promisecondition';

const runners: TaskRunner[] = [];
vscode.tasks.onDidEndTaskProcess(e => {
  for (let i = 0; i < runners.length; i++) {
    if (runners[i].execution === undefined) {
      continue;
    }
    if (e.execution === runners[i].execution) {
      runners[i].condition.set(e.exitCode);
      runners.splice(i, 1);
      break;
    }
  }
});

export class TaskRunner {
  public condition: PromiseCondition<number> = new PromiseCondition(-1);
  public execution: vscode.TaskExecution | undefined;
  public async executeTask(command: string, name: string, rootDir: string, workspace: vscode.WorkspaceFolder): Promise<number> {
    const shell = new vscode.ShellExecution(command, {
      cwd: rootDir
    });
    const task = new vscode.Task({ type: 'wpilibgradle' }, workspace, name, 'wpilib', shell);
    const runningTask = await vscode.tasks.executeTask(task);
    this.execution = runningTask;
    this.condition.reset(-1);
    runners.push(this);
    return await this.condition.wait();
  }
}

export function gradleRun(args: string, rootDir: string, workspace: vscode.WorkspaceFolder, online: boolean): Promise<number> {
  const runner = new TaskRunner();
  let command = './gradlew ' + args;
  if (!online) {
    command += ' --offline';
  }
  return runner.executeTask(command, 'gradle', rootDir, workspace);
}
*/

'use strict';
import * as child_process from 'child_process';
import * as vscode from 'vscode';

const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('gradle');

export function executeCommandAsync(command: string, rootDir: string, ow?: vscode.OutputChannel): Promise<number> {
  return new Promise((resolve, _) => {
    const exec = child_process.exec;
    const child = exec(command, {
      cwd: rootDir,
    }, (err) => {
      if (err) {
        resolve(1);
      } else {
        resolve(0);
      }
    });

    if (ow === undefined) {
      return;
    }

    child.stdout.on('data', (data) => {
      ow.append(data.toString());
    });

    child.stderr.on('data', (data) => {
      ow.append(data.toString());
    });
  });
}

export async function gradleRun(args: string, rootDir: string, _: vscode.WorkspaceFolder, online: boolean): Promise<number> {
  let command = 'gradlew ' + args;
  if (process.platform !== 'win32') {
    command = './' + command;
  }
  if (!online) {
    command += ' --offline';
  }
  outputChannel.clear();
  outputChannel.show();
  return executeCommandAsync(command, rootDir, outputChannel);
}
