import * as vscode from 'vscode';
import * as path from 'path';
import { readFileAsync } from './utilities';

('use strict');

export class WebviewProvider {
  public static async getWebviewContent(
    extensionUri: vscode.Uri,
    resourcePath: string,
    webview: vscode.Webview
  ): Promise<string> {
    // Get HTML content from file
    const htmlPath = vscode.Uri.file(path.join(extensionUri.fsPath, resourcePath));
    let html = await readFileAsync(htmlPath.fsPath, 'utf8');

    // Create URIs for scripts and stylesheets
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'main.css'))
    );

    // Add the stylesheet to the HTML content if it doesn't already have it
    if (!html.includes('main.css')) {
      html = html.replace('</head>', `<link rel="stylesheet" href="${cssUri}" />\n</head>`);
    }

    // Replace resource paths if needed
    const onDiskPath = vscode.Uri.file(extensionUri.fsPath);
    const replacePath = webview.asWebviewUri(onDiskPath);
    html = html.replace(/replaceresource/g, replacePath.toString());

    return html;
  }
}
