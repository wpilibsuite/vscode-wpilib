'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import { getIsWindows } from './utilities';

export class RioLog {

  private terminal : vscode.Terminal | undefined;

  public connect(teamNumber : number, pathToRioLogFolder: string) {

    if (this.terminal !== undefined) {
      this.terminal.dispose();
    }

    let scriptPath = path.join(pathToRioLogFolder, 'bin/riolog');

    if (getIsWindows()) {
      scriptPath += '.bat';
    }

    this.terminal = vscode.window.createTerminal('RioLog', scriptPath, [teamNumber.toString()]);

    this.terminal.show();
  }

  dispose() {
    if (this.terminal !== undefined) {
      this.terminal.dispose();
      this.terminal = undefined;
    }
  }


}
