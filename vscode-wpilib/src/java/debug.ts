'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface IDebugCommands {
  serverAddress: string;
  serverPort: string;
  project: string;
  workspace: vscode.WorkspaceFolder;
}

export async function startDebugging(commands: IDebugCommands): Promise<void> {

  const config: vscode.DebugConfiguration = {
    hostName: commands.serverAddress,
    name: 'WPILib Java Debug',
    port: commands.serverPort,
    projectName: commands.project,
    request: 'attach',
    type: 'java',
  };

  logger.log('Java debug config: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
