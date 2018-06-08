'use strict';
import * as vscode from 'vscode';
import { IExecuteAPI } from './shared/externalapi';
import { PromiseCondition } from './shared/promisecondition';

interface ITaskRunner {
  execution: vscode.TaskExecution;
  condition: PromiseCondition<number>;
}

interface ITaskRunnerQuickPick {
  label: string;
  taskRunner: ITaskRunner;
}

export class ExecuteAPI extends IExecuteAPI {
  private runners: ITaskRunner[] = [];

  constructor() {
    super();
    vscode.tasks.onDidEndTaskProcess((e) => {
      for (let i = 0; i < this.runners.length; i++) {
        if (this.runners[i].execution === undefined) {
          continue;
        }
        if (e.execution === this.runners[i].execution) {
          this.runners[i].condition.set(e.exitCode);
          this.runners.splice(i, 1);
          break;
        }
      }
    });
  }

  public async executeCommand(command: string, name: string, rootDir: string, workspace: vscode.WorkspaceFolder): Promise<number> {
    const shell = new vscode.ShellExecution(command, {
      cwd: rootDir,
    });
    const task = new vscode.Task({ type: 'wpilibgradle' }, workspace, name, 'wpilib', shell);
    const execution = await vscode.tasks.executeTask(task);
    const runner: ITaskRunner = {
      condition: new PromiseCondition(-1),
      execution,
    };
    this.runners.push(runner);
    return runner.condition.wait();
  }

  public async cancelCommands(): Promise<number> {
    if (this.runners.length === 0) {
      return 0;
    }
    const arr: ITaskRunnerQuickPick[] = [];
    for (const t of this.runners) {
      arr.push({
        label: 'todo',
        taskRunner: t,
      });
    }
    const result = await vscode.window.showQuickPick(arr, {
      canPickMany: true,
      placeHolder: 'Select tasks to cancel',
    });
    if (result === undefined) {
      return 0;
    }
    for (const r of result) {
      r.taskRunner.execution.terminate();
    }
    return result.length;
  }
}
