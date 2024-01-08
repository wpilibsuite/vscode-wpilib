'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';
import { getIsMac, getIsWindows } from '../utilities';

export interface ISimulateCommands {
  extensions: string;
  environment?: IEnvMap;
  librarydir: string;
  mainclass: string;
  stopOnEntry: boolean;
  workspace: vscode.WorkspaceFolder;
}

interface IEnvMap {
  [key: string]: unknown;
}

export async function startSimulation(commands: ISimulateCommands): Promise<void> {
  const env: IEnvMap = {
    HALSIM_EXTENSIONS: commands.extensions,
  };
  if (getIsWindows()) {
    env.PATH = commands.librarydir + ';' + process.env.SYSTEMROOT + '\\system32\\';
  } else {
    env.DYLD_LIBRARY_PATH = commands.librarydir;
    env.LD_LIBRARY_PATH = commands.librarydir;
  }

  if (commands.environment !== undefined) {
    for (const envVar of Object.keys(commands.environment)) {
      const value = commands.environment[envVar];
      env[envVar] = value;
    }
  }

  const config = {
    console: 'integratedTerminal',
    cwd: commands.workspace.uri.fsPath,
    env,
    mainClass: commands.mainclass,
    name: 'WPILib Java Simulate',
    request: 'launch',
    stopOnEntry: commands.stopOnEntry,
    type: 'java',
    vmArgs: `-Djava.library.path="${commands.librarydir}"`,
  };

  if (getIsMac()) {
    config.vmArgs += ' -XstartOnFirstThread';
  }

  logger.log('Java Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
