'use strict';

import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { IWindowView, IWindowProvider, IRioConsoleProvider, IRioConsole, IIPCSendMessage, IIPCReceiveMessage } from './interfaces';
import * as path from 'path';
import * as fs from 'fs';
import { RioConsole } from './rioconsole';
import { IPrintMessage, IErrorMessage } from './message';


interface IHTMLProvider {
    getHTML(): string;
}

export class RioLogWindowView extends EventEmitter implements IWindowView {
    private webview: vscode.Webview;
    private disposables: vscode.Disposable[] = [];

    constructor(resourceName: string, windowName: string, viewColumn: vscode.ViewColumn) {
        super();
        this.webview = vscode.window.createWebview(vscode.Uri.parse(resourceName),
            windowName, viewColumn, {
                enableScripts: true,
                enableCommandUris: true,
                retainContextWhenHidden: true
            });

        this.disposables.push(this.webview);

        vscode.window.onDidChangeActiveEditor(async (e) => {
            if (e === this.webview) {
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

    setHTML(html: string): void {
        this.webview.html = html;
    }
    async postMessage(message: IIPCSendMessage): Promise<boolean> {
        return await this.webview.postMessage(message);
    }
    dispose() {
        for (let d of this.disposables) {
            d.dispose();
        }
    }

    async handleSave(saveData: (IPrintMessage | IErrorMessage)[]): Promise<boolean> {
        let d = await vscode.workspace.openTextDocument({
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

    createWindowView(): IWindowView {
        let wv = new RioLogWindowView('wpilib:riologlive', 'RioLog', vscode.ViewColumn.Three);
        wv.setHTML(this.htmlProvider.getHTML());
        return wv;
    }
}

export class RioLogViewerWebviewProvider implements IWindowProvider {
    private htmlProvider: RioLogViewerHTMLProvider;

    constructor(resourceRoot: string){
        this.htmlProvider = new RioLogViewerHTMLProvider(resourceRoot);
    }

    createWindowView(): IWindowView {
        let wv = new RioLogWindowView('wpilib:riologviewer', 'RioLogViewer', vscode.ViewColumn.Three);
        wv.setHTML(this.htmlProvider.getHTML());
        return wv;
    }
}

export class RioLogHTMLProvider implements IHTMLProvider {
    private html: string | undefined;
    
    constructor(resourceRoot: string) {
        let htmlFile = path.join(resourceRoot, 'live.html');
        let scriptFile = path.join(resourceRoot, 'bundle.js');

        this.html = fs.readFileSync(htmlFile, 'utf8');
        this.html += '\r\n<script>\r\n';
        this.html += fs.readFileSync(scriptFile, 'utf8');
        this.html += '\r\n</script>\r\n';
    }

    getHTML(): string {
        if (this.html === undefined) {
            return '';
        }
        return this.html;
    }
}

export class LiveRioConsoleProvider implements IRioConsoleProvider {
    getRioConsole(): IRioConsole {
        return new RioConsole();
    }
}

export class ViewerRioConsoleProvider implements IRioConsoleProvider {
    getRioConsole(): IRioConsole {
        return new RioLogViewer();
    }
}

class RioLogViewer extends EventEmitter implements IRioConsole {
    connected: boolean = true;
    discard: boolean = false;
    stop(): void {
        
    }
    startListening(_: number): void {
        // Send everything
        vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false
        }).then((v) => {
            if (v === undefined) {
                return;
            }
            if (v.length !== 1) {
                return;
            }
            fs.readFile(v[0].fsPath, 'utf8', (err, data) => {
                if (err) {
                    console.log(err);
                } else {
                    let obj: (IPrintMessage | IErrorMessage)[] = JSON.parse(data);
                    for (let o of obj) {
                        this.emit('message', o);
                    }
                }
            });
        });
    }
    setAutoReconnect(_: boolean): void {
    }
    getAutoReconnect(): boolean {
        return true;
    }
    disconnect(): void {
    }
    dispose() {
    }
}

class RioLogViewerHTMLProvider implements IHTMLProvider {
    private html: string;

    constructor(resourceRoot: string) {
        let htmlFile = path.join(resourceRoot,'viewer.html');
        let scriptFile = path.join(resourceRoot, 'bundle.js');

        this.html = fs.readFileSync(htmlFile, 'utf8');
        this.html += '\r\n<script>\r\n';
        this.html += fs.readFileSync(scriptFile, 'utf8');
        this.html += '\r\n</script>\r\n';
    }

    getHTML(): string {
        if (this.html === undefined) {
            return '';
        }
        return this.html;
    }
}
