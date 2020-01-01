'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';
import { getIsMac, getIsWindows } from '../utilities';

export interface ISimulateCommands {
  extensions: string;
  librarydir: string;
  mainclass: string;
  robotclass: string;
  stopOnEntry: boolean;
  workspace: vscode.WorkspaceFolder;
}

interface IEnvMap {
  // tslint:disable-next-line: no-any
  [key: string]: any;
}

export async function startSimulation(commands: ISimulateCommands): Promise<void> {
  const env: IEnvMap = {
    HALSIM_EXTENSIONS: commands.extensions,
  };
  if (getIsWindows()) {
    env.PATH = commands.librarydir;
  } else {
    env.DYLD_LIBRARY_PATH = commands.librarydir;
    env.LD_LIBRARY_PATH = commands.librarydir;
  }

  const config = {
    args: commands.robotclass,
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

  console.log(config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
