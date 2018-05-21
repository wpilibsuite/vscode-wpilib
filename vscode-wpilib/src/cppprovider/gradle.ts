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
    const task = new vscode.Task({ type: 'gradlecpp' }, workspace, name, 'vscodecpp', shell);
    const runningTask = await vscode.tasks.executeTask(task);
    this.execution = runningTask;
    this.condition.reset(-1);
    runners.push(this);
    return await this.condition.wait();
  }
}

export function gradleRun(args: string, rootDir: string, workspace: vscode.WorkspaceFolder): Promise<number> {
  const runner = new TaskRunner();
  const command = './gradlew ' + args;
  return runner.executeTask(command, 'gradle', rootDir, workspace);
}
