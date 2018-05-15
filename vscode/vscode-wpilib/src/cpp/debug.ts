'use strict';
import * as vscode from 'vscode';
import * as path from 'path';

export interface DebugCommands {
  serverAddress: string;
  serverPort: string;
  sysroot: string;
  executablePath: string;
  workspace: vscode.WorkspaceFolder;
  soLibPath: string;
  additionalCommands: string[];
}

export async function startDebugging(commands: DebugCommands): Promise<void> {
  const config: vscode.DebugConfiguration = {
    name: 'wpilibCppDebug',
    type: 'cppdbg',
    request: 'launch',
    miDebuggerServerAddress: commands.serverAddress + ':' + commands.serverPort,
    miDebuggerPath: path.join(commands.sysroot, 'bin/arm-frc-linux-gnueabi-gdb'),
    program: commands.executablePath,
    cwd: commands.workspace.uri.fsPath,
    externalConsole: true,
    MIMode: 'gdb',
    setupCommands: [
      {
        description: 'Enable pretty-printing for gdb',
        text: 'enable-pretty-printing',
        ignoreFailures: true
      },
      {
        text: 'set sysroot ' + commands.sysroot
      },
    ],
    additionalSOLibSearchPath: commands.soLibPath,
  };

  for (const a of commands.additionalCommands) {
    config.setupCommands.push({
      text: a
    });
  }

  const nodePlatform: NodeJS.Platform = process.platform;
  if (nodePlatform === 'win32') {
    config.miDebuggerPath += '.exe';
  }

  await vscode.debug.startDebugging(commands.workspace, config);
}
