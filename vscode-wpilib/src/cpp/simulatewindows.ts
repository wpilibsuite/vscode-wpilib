'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';

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

  logger.log('C++ Windows Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
