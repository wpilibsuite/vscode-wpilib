'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface IUnixSimulateCommands {
  executablePath: string;
  extensions: string;
  workspace: vscode.WorkspaceFolder;
  stopAtEntry: boolean;
  clang: boolean;
  soLibPath: string;
  ldPath: string;
  srcPaths: Set<string>;
}

export async function startUnixSimulation(commands: IUnixSimulateCommands): Promise<void> {
  const config: vscode.DebugConfiguration = {
    MIMode: commands.clang ? 'lldb' : 'gdb',
    additionalSOLibSearchPath: commands.soLibPath,
    cwd: commands.workspace.uri.fsPath,
    environment: [{
      name: 'HALSIM_EXTENSIONS', value: commands.extensions,
    }, {
      name: 'LD_LIBRARY_PATH', value: commands.ldPath,
    }, {
      name: 'DYLD_FALLBACK_LIBRARY_PATH', value: commands.ldPath,
    }],
    externalConsole: false,
    name: 'WPILib C++ Simulate',
    program: commands.executablePath,
    request: 'launch',
    setupCommands: [
      {
        description: 'Enable pretty-printing for gdb',
        ignoreFailures: true,
        text: 'enable-pretty-printing',
      },
    ],
    stopAtEntry: commands.stopAtEntry,
    type: 'cppdbg',
  };

  for (const a of commands.srcPaths) {
    /* tslint:disable-next-line:no-unsafe-any */
    config.setupCommands.push({
      text: 'dir ' + a,
    });
  }

  logger.log('C++ Unix Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
