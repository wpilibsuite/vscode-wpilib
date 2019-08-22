'use strict';
import * as vscode from 'vscode';
import { logger } from '../logger';

export interface ISimulateCommands {
  extensions: string;
  librarydir: string;
  mainclass: string;
  robotclass: string;
  stopOnEntry: boolean;
  workspace: vscode.WorkspaceFolder;
}

export interface ICodeLensCommand {
  console: string;
  cwd: string;
  env: { [key: string]: string };
  mainClass: string;
  name: string;
  request: string;
  stopOnEntry: boolean;
  type: string;
  vmArgs: string;
}

export interface ITestCodeLensCommand {
  env: { [key: string]: string };
  name: string;
  vmargs: string[];
  workingDirectory: string;
}

export async function getCodeLensRunCommand(commands: ISimulateCommands): Promise<ICodeLensCommand> {
  let mainClassName = commands.mainclass;
  const lastDot = mainClassName.lastIndexOf('.');
  if (lastDot > 0) {
    mainClassName = mainClassName.substring(lastDot + 1);
  }
  return {
    console: 'integratedTerminal',
    cwd: commands.workspace.uri.fsPath,
    env: {
      DYLD_LIBRARY_PATH: commands.librarydir,
      HALSIM_EXTENSIONS: commands.extensions,
      LD_LIBRARY_PATH: commands.librarydir,
      PATH: commands.librarydir,
    },
    mainClass: commands.mainclass,
    name: `CodeLens (Launch) - ${mainClassName}`,
    request: 'launch',
    stopOnEntry: commands.stopOnEntry,
    type: 'java',
    vmArgs: `-Djava.library.path="${commands.librarydir}"`,
  };
}

export async function getCodeLensTestCommand(commands: ISimulateCommands): Promise<ITestCodeLensCommand> {
  const runData = await getCodeLensRunCommand(commands);
  return {
    env: runData.env,
    name: 'WPILib Configuration',
    vmargs: [runData.vmArgs],
    workingDirectory: commands.workspace.uri.fsPath,
  };
}

export async function startSimulation(commands: ISimulateCommands): Promise<void> {
  const config: vscode.DebugConfiguration = {
    args: commands.robotclass,
    console: 'integratedTerminal',
    cwd: commands.workspace.uri.fsPath,
    env: {
      DYLD_LIBRARY_PATH: commands.librarydir,
      HALSIM_EXTENSIONS: commands.extensions,
      LD_LIBRARY_PATH: commands.librarydir,
      PATH: commands.librarydir,
    },
    mainClass: commands.mainclass,
    name: 'WPILib Java Simulate',
    request: 'launch',
    stopOnEntry: commands.stopOnEntry,
    type: 'java',
    vmArgs: `-Djava.library.path="${commands.librarydir}"`,
  };

  logger.log('Java Simulation: ', config);

  await vscode.debug.startDebugging(commands.workspace, config);
}
