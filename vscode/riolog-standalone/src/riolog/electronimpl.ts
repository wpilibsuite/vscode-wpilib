'use strict';
import { IWindowView, IWindowProvider, IRioConsoleProvider, IRioConsole } from './shared/interfaces';
import { EventEmitter } from 'events';
import { RioConsole } from './shared/rioconsole';
import * as fs from 'fs';
import { IPrintMessage, IErrorMessage } from './shared/message';

const ipcMain = require('electron').ipcMain;
const dialog = require('electron').dialog;

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

  async handleSave(saveData: (IPrintMessage | IErrorMessage)[]): Promise<boolean> {
    const file = await new Promise<string>((resolve, _) => {
      dialog.showSaveDialog({
        title: 'Select a file to save to'
      }, (f) => {
        resolve(f);
      });
    });
    console.log(file);

    if (file === undefined) {
      return false;
    }

    await new Promise((resolve, _) => {
      fs.writeFile(file, JSON.stringify(saveData, null, 4), 'utf8', () => {
        resolve();
      });
    });

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
