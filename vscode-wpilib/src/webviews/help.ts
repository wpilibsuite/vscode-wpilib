'use strict';
import * as path from 'path';
import * as vscode from 'vscode';
import { extensionContext } from '../utilities';
import { WebViewBase } from './webviewbase';

export class Help extends WebViewBase {
  public static async Create(resourceRoot: string): Promise<Help> {
    const help = new Help(resourceRoot);
    await help.asyncInitialize();
    return help;
  }

  private constructor(resourceRoot: string) {
    super('wpilibhelp', 'WPILib Help', resourceRoot);

    this.disposables.push(
      vscode.commands.registerCommand('wpilibcore.help', () => {
        this.displayHelp();
      })
    );
  }

  private messageHandlerSetup = false;

  public displayHelp() {
    const wasUndefined = this.webview === undefined;
    this.displayWebView(vscode.ViewColumn.Active, true);

    // Set up message handler for button clicks only when webview is first created
    if (this.webview && wasUndefined && !this.messageHandlerSetup) {
      this.messageHandlerSetup = true;
      this.webview.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case 'openCommandPalette':
              vscode.commands.executeCommand('workbench.action.quickOpen', '>WPILib ');
              break;
            case 'openDocumentation':
              vscode.commands.executeCommand(
                'vscode.open',
                vscode.Uri.parse('https://docs.wpilib.org/en/2027')
              );
              break;
          }
        },
        undefined,
        this.disposables
      );
      // Reset flag when webview is disposed
      this.webview.onDidDispose(() => {
        this.messageHandlerSetup = false;
      });
    }
  }

  private async asyncInitialize() {
    await this.loadWebpage(
      path.join(extensionContext.extensionPath, 'resources', 'dist', 'help.html'),
      undefined,
      ['help']
    );
  }
}
