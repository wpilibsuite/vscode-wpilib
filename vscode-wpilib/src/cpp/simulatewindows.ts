'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface IWindowsSimulateCommands {
  extensions: string;
  environment?: IEnvMap;
  launchfile: string;
  stopAtEntry: boolean;
  workspace: vscode.WorkspaceFolder;
  debugPaths: string[];
  srcPaths: string[];
}

interface IEnvMap {
  // tslint:disable-next-line: no-any
  [key: string]: any;
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
    console: "integratedTerminal",
    name: 'WPILib C++ Simulate',
    program: commands.launchfile,
    request: 'launch',
    stopAtEntry: commands.stopAtEntry,
    symbolSearchPath,
    type: 'cppvsdbg',
  };

  if (commands.environment !== undefined) {
    for (const envVar of Object.keys(commands.environment)) {
      const value = commands.environment[envVar];
      /* tslint:disable-next-line:no-unsafe-any */
      config.environment.push({
        name: envVar,
        value,
      });
    }
  }

  logger.log('C++ Windows Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
