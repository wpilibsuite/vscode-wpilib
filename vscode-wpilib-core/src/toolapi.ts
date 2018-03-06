'use scrict';
import * as vscode from 'vscode';
import { IToolAPI, IToolRunner } from './shared/externalapi';

interface IToolQuickPick extends vscode.QuickPickItem {
  runner: IToolRunner;
}

export class ToolAPI extends IToolAPI {
  private tools: IToolQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];

  async startTool(): Promise<boolean> {
    if (this.tools.length <= 0) {
      vscode.window.showErrorMessage('No tools found. Please install some');
      return false;
    }

    let result = await vscode.window.showQuickPick(this.tools, { placeHolder: 'Pick a tool' });

    if (result === undefined) {
      vscode.window.showInformationMessage('Tool run canceled');
      return false;
    }

    return await result.runner.runTool();
  }
  addTool(tool: IToolRunner): void {
    let qpi: IToolQuickPick = {
      label: tool.getDisplayName(),
      description: tool.getDescription(),
      runner: tool
    };
    this.tools.push(qpi);
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
