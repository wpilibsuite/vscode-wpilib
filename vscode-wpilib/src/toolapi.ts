'use scrict';
import * as vscode from 'vscode';
import { IToolAPI, IToolRunner } from './shared/externalapi';

interface IToolQuickPick extends vscode.QuickPickItem {
  runner: IToolRunner;
}

export class ToolAPI extends IToolAPI {
  private tools: IToolQuickPick[] = [];
  private disposables: vscode.Disposable[] = [];

  public async startTool(): Promise<boolean> {
    if (this.tools.length <= 0) {
      vscode.window.showErrorMessage('No tools found. Please install some');
      return false;
    }

    const result = await vscode.window.showQuickPick(this.tools, { placeHolder: 'Pick a tool' });

    if (result === undefined) {
      vscode.window.showInformationMessage('Tool run canceled');
      return false;
    }

    return result.runner.runTool();
  }
  public addTool(tool: IToolRunner): void {
    const qpi: IToolQuickPick = {
      description: tool.getDescription(),
      label: tool.getDisplayName(),
      runner: tool,
    };
    this.tools.push(qpi);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
