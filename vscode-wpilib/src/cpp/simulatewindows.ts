'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExecuteAPI } from 'vscode-wpilibapi';
import { logger } from '../logger';

export interface IWindowsSimulateCommands {
  extensions: string;
  environment?: { [key: string]: string };
  launchfile: string;
  stopAtEntry: boolean;
  workspace: vscode.WorkspaceFolder;
  debugPaths: string[];
  srcPaths: string[];
}

export async function simulateWindowsWindbgX(commands: IWindowsSimulateCommands, executor: IExecuteAPI): Promise<void> {
  const env:  { [key: string]: string } = {
    HALSIM_EXTENSIONS: commands.extensions,
  };
  if (commands.environment !== undefined) {
    for (const envVar of Object.keys(commands.environment)) {
      const value = commands.environment[envVar];
      env[envVar] = value;
    }
  }
  logger.log('C++ WinDbg Simulation', commands.launchfile, commands.workspace.uri.fsPath, env);
  await executor.executeCommand('WinDbgX ' + commands.launchfile, 'windbgx', commands.workspace.uri.fsPath, commands.workspace, env);
}

export async function startWindowsSimulation(commands: IWindowsSimulateCommands, executor: IExecuteAPI): Promise<void> {
  const wpConfiguration = vscode.workspace.getConfiguration('wpilib', commands.workspace.uri);
  const res = wpConfiguration.get<boolean>('useWindbgX');
  if (res === true) {
    return simulateWindowsWindbgX(commands, executor);
  }

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
    console: 'integratedTerminal',
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
