'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface IUnixSimulateCommands {
  executablePath: string;
  extensions: string;
  workspace: vscode.WorkspaceFolder;
  environment?: { [key: string]: string };
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
    console: 'integratedTerminal',
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
    config.setupCommands.push({
      text: 'dir ' + a,
    });
  }

  if (commands.environment !== undefined) {
    for (const envVar of Object.keys(commands.environment)) {
      const value = commands.environment[envVar];
      config.environment.push({
        name: envVar,
        value,
      });
    }
  }

  logger.log('C++ Unix Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
