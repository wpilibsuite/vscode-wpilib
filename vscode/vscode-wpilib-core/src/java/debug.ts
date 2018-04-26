'use strict';
import * as vscode from 'vscode';
import * as path from 'path';

export interface DebugCommands {
  serverAddress: string;
  serverPort: string;
  workspace: vscode.WorkspaceFolder;
}

export async function startDebugging(commands: DebugCommands): Promise<void> {
  const bp = path.basename(commands.workspace.uri.fsPath);

  const config: vscode.DebugConfiguration = {
    name: 'wpilibJavaDebug',
    type: 'java',
    request: 'attach',
    hostName: commands.serverAddress,
    port: commands.serverPort,
    projectName: bp
  };

  await vscode.debug.startDebugging(commands.workspace, config);
}
