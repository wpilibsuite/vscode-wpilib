/*

// add     `"enableProposedApi": true, ` to package.json
// Also find the latest vscode.proposed.d.ts, and add it to the code base to be compiled.

'use strict';

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { IWindowView, IWindowProvider, IRioConsoleProvider, IRioConsole, IIPCSendMessage, IIPCReceiveMessage } from './shared/interfaces';
import * as path from 'path';
import * as fs from 'fs';
import { RioConsole } from './shared/rioconsole';
import { IPrintMessage, IErrorMessage } from './shared/message';


interface IHTMLProvider {
    getHTML(): string;
}

export class RioLogWindowView extends EventEmitter implements IWindowView {
    private webview: vscode.Webview;
    private disposables: vscode.Disposable[] = [];

    constructor(resourceName: string, windowName: string, viewColumn: vscode.ViewColumn) {
        super();
        this.webview = vscode.window.createWebview(resourceName,
            windowName, viewColumn, {
                enableScripts: true,
                enableCommandUris: true,
                retainContextWhenHidden: true
            });

        this.disposables.push(this.webview);

        this.webview.onDidChangeViewState((s) => {
            if (s.active === true) {
                this.emit('windowActive');
            }
        }, null, this.disposables);

        this.webview.onDidReceiveMessage((data: IIPCReceiveMessage) => {
            this.emit('didReceiveMessage', data);
        }, null, this.disposables);

        this.webview.onDidDispose(() => {
            this.emit('didDispose');
        }, null, this.disposables);
    }

    public setHTML(html: string): void {
        this.webview.html = html;
    }
    public async postMessage(message: IIPCSendMessage): Promise<boolean> {
        return await this.webview.postMessage(message);
    }
    public dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }

    public async handleSave(saveData: (IPrintMessage | IErrorMessage)[]): Promise<boolean> {
        const d = await vscode.workspace.openTextDocument({
            language: 'json',
            content: JSON.stringify(saveData, null, 4)
        });
        await vscode.window.showTextDocument(d);
        return true;
    }
}

export class RioLogWebviewProvider implements IWindowProvider {
    private htmlProvider: RioLogHTMLProvider;

    constructor(resourceRoot: string){
        this.htmlProvider = new RioLogHTMLProvider(resourceRoot);
    }

    public createWindowView(): IWindowView {
        const wv = new RioLogWindowView('wpilib:riologlive', 'RioLog', vscode.ViewColumn.Three);
        wv.setHTML(this.htmlProvider.getHTML());
        return wv;
    }
}


export class RioLogHTMLProvider implements IHTMLProvider {
    private html: string | undefined;

    constructor(resourceRoot: string) {
        const htmlFile = path.join(resourceRoot, 'live.html');
        const scriptFile = path.join(resourceRoot, 'bundle.js');

        this.html = fs.readFileSync(htmlFile, 'utf8');
        this.html += '\r\n<script>\r\n';
        this.html += fs.readFileSync(scriptFile, 'utf8');
        this.html += '\r\n</script>\r\n';
    }

    public getHTML(): string {
        if (this.html === undefined) {
            return '';
        }
        return this.html;
    }
}

export class LiveRioConsoleProvider implements IRioConsoleProvider {
    public getRioConsole(): IRioConsole {
        return new RioConsole();
    }
}



*/
