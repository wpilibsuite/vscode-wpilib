'use strict';
import * as vscode from 'vscode';

export interface DebugCommands {
  serverAddress: string;
  serverPort: string;
  project: string;
  workspace: vscode.WorkspaceFolder;
}

export async function startDebugging(commands: DebugCommands): Promise<void> {

  const config: vscode.DebugConfiguration = {
    name: 'wpilibJavaDebug',
    type: 'java',
    request: 'attach',
    hostName: commands.serverAddress,
    port: commands.serverPort,
    projectName: commands.project
  };

  await vscode.debug.startDebugging(commands.workspace, config);
}
