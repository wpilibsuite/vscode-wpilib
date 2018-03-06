'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IExternalAPI, IToolRunner, getExternalAPIExpectedVersion, getToolAPIExpectedVersion } from './shared/externalapi';
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

    let baseValid = coreExports.getVersion() === getExternalAPIExpectedVersion();

    if (!baseValid) {
        vscode.window.showErrorMessage('Extension out of date with core extension. Please update');
        return;
    }

    let tools = coreExports.getToolAPI();
    let toolsValid = false;

    if (tools !== undefined) {
        toolsValid = tools.getVersion() === getToolAPIExpectedVersion();
    }

    if (!toolsValid) {
        vscode.window.showInformationMessage('Tools do not match core. Update');
        console.log('Tools do not match core');
        return;
    }

    let outlineViewerLocation = path.join(context.extensionPath, 'resources', 'OutlineViewer.jar');



    let toolRunner: IToolRunner = {
        async runTool(): Promise<boolean> {
            let command = 'java -jar ' + outlineViewerLocation;
            child_process.exec(command);
            return true;
        },
        getDisplayName(): string {
            return 'Outline Viewer';
        },
        getDescription(): string {
            return 'The NetworkTables debug tool';
        }
    };

    tools!.addTool(toolRunner);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
