'use strict';
import * as vscode from 'vscode';

export interface IWindowsSimulateCommands {
  extensions: string;
  launchfile: string;
  stopAtEntry: boolean;
  workspace: vscode.WorkspaceFolder;
}

export async function startWindowsSimulation(commands: IWindowsSimulateCommands): Promise<void> {

  const config: vscode.DebugConfiguration = {
    cwd: commands.workspace.uri.fsPath,
    environment: {
      HALSIM_EXTENSIONS: commands.extensions,
    },
    externalConsole: true,
    name: 'WPILib C++ Simulate',
    request: 'launch',
    stopAtEntry: commands.stopAtEntry,
    type: 'cppvsdbg',
  };

  await vscode.debug.startDebugging(commands.workspace, config);
}
