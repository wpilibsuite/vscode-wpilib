'use strict';
import { IWindowView, IWindowProvider, IRioConsoleProvider, IRioConsole, IIPCReceiveMessage, IIPCSendMessage } from './shared/interfaces';
import { EventEmitter } from 'events';
import { RioConsole } from './shared/rioconsole';
import * as fs from 'fs';
import { IPrintMessage, IErrorMessage } from './shared/message';

const dialog = require('electron').remote.dialog;

export class RioLogWindowView extends EventEmitter implements IWindowView {
  private fromMain: (data: IIPCSendMessage) => Promise<void>;

  constructor(fromMain: (data: IIPCSendMessage) => Promise<void>) {
    super();
    this.fromMain = fromMain;
  }

  public messageToMain(data: IIPCReceiveMessage) {
    this.emit('didReceiveMessage', data);
  }

  async postMessage(message: IIPCSendMessage): Promise<boolean> {
    await this.fromMain(message);
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
  private view: IWindowView;

  constructor(view: IWindowView) {
    this.view = view;
  }

  createWindowView(): IWindowView {
    return this.view;
  }
}

export class LiveRioConsoleProvider implements IRioConsoleProvider {
  getRioConsole(): IRioConsole {
      return new RioConsole();
  }
}
