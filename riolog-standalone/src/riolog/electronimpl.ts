'use strict';
import { IWindowView, IWindowProvider, IRioConsoleProvider, IRioConsole } from './interfaces';
import { EventEmitter } from 'events';
import { RioConsole } from './rioconsole';

const ipcMain = require('electron').ipcMain;

export class RioLogWindowView extends EventEmitter implements IWindowView {
  private window: Electron.BrowserWindow;

  constructor(window: Electron.BrowserWindow) {
    super();
    this.window = window;

    ipcMain.on('messageToMain', (_:any, data:any) => {
      this.emit('didReceiveMessage', data);
    });
  }

  async postMessage(message: any): Promise<boolean> {
    this.window.webContents.send('messageFromMain', message);
    return true;
  }

  async handleSave(_: any): Promise<boolean> {
    return true;
  }

  dispose() {

  }
}

export class RioLogWebviewProvider implements IWindowProvider {
  private window: Electron.BrowserWindow;

  constructor(window: Electron.BrowserWindow) {
    this.window = window;
  }

  createWindowView(): IWindowView {
    return new RioLogWindowView(this.window);
  }
}

export class LiveRioConsoleProvider implements IRioConsoleProvider {
  getRioConsole(): IRioConsole {
      return new RioConsole();
  }
}