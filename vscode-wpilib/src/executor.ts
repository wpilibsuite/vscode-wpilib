'use strict';
import * as vscode from 'vscode';
import { IExecuteAPI } from 'vscode-wpilibapi';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { PromiseCondition } from './shared/promisecondition';
import { getIsWindows } from './utilities';

interface ITaskRunner {
  execution: vscode.TaskExecution;
  condition: PromiseCondition<number>;
  cancelled: boolean;
}

interface ITaskRunnerQuickPick {
  label: string;
  taskRunner: ITaskRunner;
}

export class ExecuteAPI implements IExecuteAPI {
  private runners: ITaskRunner[] = [];

  constructor() {
    vscode.tasks.onDidEndTaskProcess((e) => {
      for (let i = 0; i < this.runners.length; i++) {
        if (this.runners[i].execution === undefined) {
          continue;
        }
        if (e.execution === this.runners[i].execution) {
          if (this.runners[i].cancelled) {
            this.runners[i].condition.set(-1);
          } else {
            this.runners[i].condition.set(e.exitCode ?? -1);
          }
          this.runners.splice(i, 1);
          break;
        }
      }
    });
  }

  public async executeCommand(command: string, name: string, rootDir: string, workspace: vscode.WorkspaceFolder,
                              env?: { [key: string]: string }): Promise<number> {
    const shell = new vscode.ShellExecution(command, {
      cwd: rootDir,
      env,
    });

    if (getIsWindows()) {
      if (command.startsWith('./')) {
        command = command.substring(2);
      }
      shell.commandLine = command;
      if (shell.options !== undefined) {
        shell.options.executable = 'cmd.exe';
        shell.options.shellArgs = ['/d', '/c'];
      }
    }

    logger.log('executing command in workspace', shell, workspace.uri.fsPath);

    const task = new vscode.Task({ type: 'wpilibgradle' }, workspace, name, 'wpilib', shell);
    task.presentationOptions.echo = true;
    task.presentationOptions.clear = true;
    const execution = await vscode.tasks.executeTask(task);
    const runner: ITaskRunner = {
      cancelled: false,
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
        label: t.execution.task.name,
        taskRunner: t,
      });
    }
    const result = await vscode.window.showQuickPick(arr, {
      canPickMany: true,
      placeHolder: i18n('message', 'Select tasks to cancel'),
    });
    if (result === undefined) {
      return 0;
    }
    for (const r of result) {
      r.taskRunner.cancelled = true;
      r.taskRunner.execution.terminate();
    }
    return result.length;
  }
}
