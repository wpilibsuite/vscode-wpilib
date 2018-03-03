'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI, IToolRunner } from './shared/externalapi';
import * as path from 'path';
//import * as process from 'process';
import * as child_process from 'child_process';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-wpilib-outlineviewer" is now active!');

    let coreExtension = vscode.extensions.getExtension<IExternalAPI>('wpifirst.vscode-wpilib-core');
    if (coreExtension === undefined) {
        vscode.window.showErrorMessage('Could not find core library');
        return;
    }

    if (!coreExtension.isActive) {
        await coreExtension.activate();
    }

    let coreExports: IExternalAPI = coreExtension.exports;

    let outlineViewerLocation = path.join(context.extensionPath, 'resources', 'OutlineViewer.jar');



    let toolRunner: IToolRunner = {
        async runTool(): Promise<void> {
            let command = 'java -jar ' + outlineViewerLocation;
            child_process.exec(command);
        },
        getDisplayName(): string {
            return 'Outline Viewer';
        }
    };

    coreExports.addTool(toolRunner);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
