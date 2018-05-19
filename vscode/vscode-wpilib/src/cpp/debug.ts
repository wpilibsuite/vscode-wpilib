'use strict';
import * as vscode from 'vscode';

export interface DebugCommands {
  target: string;
  sysroot: string;
  executablePath: string;
  workspace: vscode.WorkspaceFolder;
  soLibPath: string;
  headerPaths: string[];
  srcPaths: string[];
  libSrcPaths: string[];
  gdbPath: string;
}

export async function startDebugging(commands: DebugCommands): Promise<void> {
  const config: vscode.DebugConfiguration = {
    name: 'wpilibCppDebug',
    type: 'cppdbg',
    request: 'launch',
    miDebuggerServerAddress: commands.target,
    miDebuggerPath: commands.gdbPath,
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

  for (const a of commands.srcPaths) {
    config.setupCommands.push({
      text: 'dir ' + a
    });
  }

  for (const a of commands.headerPaths) {
    config.setupCommands.push({
      text: 'dir ' + a
    });
  }

  for (const a of commands.libSrcPaths) {
    config.setupCommands.push({
      text: 'dir ' + a
    });
  }

  await vscode.debug.startDebugging(commands.workspace, config);
}
