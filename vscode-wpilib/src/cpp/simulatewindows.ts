'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface IWindowsSimulateCommands {
  extensions: string;
  launchfile: string;
  stopAtEntry: boolean;
  workspace: vscode.WorkspaceFolder;
  debugPaths: string[];
  srcPaths: string[];
}

export async function startWindowsSimulation(commands: IWindowsSimulateCommands): Promise<void> {

  let symbolSearchPath = '';

  for (const c of commands.debugPaths) {
    symbolSearchPath = symbolSearchPath + path.dirname(c) + ';';
  }

  for (const c of commands.srcPaths) {
    symbolSearchPath = symbolSearchPath + path.dirname(c) + ';';
  }

  const config: vscode.DebugConfiguration = {
    cwd: commands.workspace.uri.fsPath,
    // environment: [{
    //   HALSIM_EXTENSIONS: commands.extensions,
    // }],
    externalConsole: true,
    name: 'WPILib C++ Simulate',
    program: commands.launchfile,
    request: 'launch',
    stopAtEntry: commands.stopAtEntry,
    symbolSearchPath,
    type: 'cppvsdbg',
  };

  logger.log('C++ Windows Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
