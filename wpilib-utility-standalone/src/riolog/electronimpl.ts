'use strict';
import * as electron from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { IIPCReceiveMessage, IIPCSendMessage, IRioConsole, IRioConsoleProvider, IWindowProvider, IWindowView } from './shared/interfaces';
import { IErrorMessage, IPrintMessage } from './shared/message';
import { RioConsole } from './shared/rioconsole';

const dialog = electron.remote.dialog;

export class RioLogWindowView extends EventEmitter implements IWindowView {
  private fromMain: (data: IIPCSendMessage) => Promise<void>;

  constructor(fromMain: (data: IIPCSendMessage) => Promise<void>) {
    super();
    this.fromMain = fromMain;
  }

  public messageToMain(data: IIPCReceiveMessage) {
    this.emit('didReceiveMessage', data);
  }

  public async postMessage(message: IIPCSendMessage): Promise<boolean> {
    await this.fromMain(message);
    return true;
  }

  public async handleSave(saveData: Array<IPrintMessage | IErrorMessage>): Promise<boolean> {
    const file = await new Promise<string>((resolve, _) => {
      dialog.showSaveDialog({
        title: 'Select a file to save to',
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

  // tslint:disable-next-line:no-empty
  public dispose() {

  }
}

export class RioLogWebviewProvider implements IWindowProvider {
  private view: IWindowView;

  constructor(view: IWindowView) {
    this.view = view;
  }

  public createWindowView(): IWindowView {
    return this.view;
  }
}

export class LiveRioConsoleProvider implements IRioConsoleProvider {
  public getRioConsole(): IRioConsole {
      return new RioConsole();
  }
}
