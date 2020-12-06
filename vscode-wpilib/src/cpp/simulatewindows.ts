'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface IWindowsSimulateCommands {
  extensions: string;
  environment?: Map<string, string>;
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
    environment: [{
      name: 'HALSIM_EXTENSIONS',
      value: commands.extensions,
    }],
    externalConsole: true,
    name: 'WPILib C++ Simulate',
    program: commands.launchfile,
    request: 'launch',
    stopAtEntry: commands.stopAtEntry,
    symbolSearchPath,
    type: 'cppvsdbg',
  };

  if (commands.environment !== undefined) {
    for (const envVar of commands.environment) {
      /* tslint:disable-next-line:no-unsafe-any */
      config.enviroment.push({
        name: envVar[0],
        value: envVar[1]
      });
    }
  }

  logger.log('C++ Windows Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
