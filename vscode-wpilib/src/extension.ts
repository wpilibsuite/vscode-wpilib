'use strict';

// // These must be in the files to translate
// // This cannot be placed in a library.
// import * as nls from 'vscode-nls';
// const config = JSON.parse(process.env.VSCODE_NLS_CONFIG as string);
// const localize = nls.config(config as nls.Options)();

import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(_context: vscode.ExtensionContext) {
  vscode.window.showErrorMessage('This extension is not supported from the VS Code Marketplace. Please use the WPILib Installer', {
    modal: true
  });
}
