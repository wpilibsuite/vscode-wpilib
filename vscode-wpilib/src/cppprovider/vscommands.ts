import * as vscode from 'vscode';
import { ApiProvider } from './apiprovider';

export function createCommands(context: vscode.ExtensionContext, configLoaders: ApiProvider[]) {
  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.selectCppToolchain', async () => {
    const workspaces = vscode.workspace.workspaceFolders;

    if (workspaces === undefined) {
      return;
    }

    for (const wp of workspaces) {
      for (const loader of configLoaders) {
        if (wp.uri.fsPath === loader.workspace.uri.fsPath) {
          await loader.selectToolChain();
        }
      }
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.selectCppBinaryTypes', async () => {
    const workspaces = vscode.workspace.workspaceFolders;

    if (workspaces === undefined) {
      return;
    }

    for (const wp of workspaces) {
      for (const loader of configLoaders) {
        if (wp.uri.fsPath === loader.workspace.uri.fsPath) {
          await loader.selectEnabledBinaryTypes();
        }
      }
    }
  }));

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(vscode.commands.registerCommand('wpilibcore.refreshCppProperties', async () => {
    const workspaces = vscode.workspace.workspaceFolders;

    if (workspaces === undefined) {
      return;
    }

    for (const wp of workspaces) {
      for (const loader of configLoaders) {
        if (wp.uri.fsPath === loader.workspace.uri.fsPath) {
          await loader.runGradleRefresh();
          await loader.loadConfigs();
        }
      }
    }
  }));
}
