'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface ISimulateCommands {
  extensions: string;
  librarydir: string;
  mainclass: string;
  robotclass: string;
  stopOnEntry: boolean;
  workspace: vscode.WorkspaceFolder;
}

export async function startSimulation(commands: ISimulateCommands): Promise<void> {
  const config: vscode.DebugConfiguration = {
    args: commands.robotclass,
    console: 'integratedTerminal',
    cwd: commands.workspace.uri.fsPath,
    env: {
      HALSIM_EXTENSIONS: commands.extensions,
      PATH: commands.librarydir,
    },
    mainClass: commands.mainclass,
    name: 'WPILib Java Simulate',
    request: 'launch',
    stopOnEntry: commands.stopOnEntry,
    type: 'java',
    vmArgs: `-Djava.library.path="${commands.librarydir}"`,
  };

  logger.log('Java Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
