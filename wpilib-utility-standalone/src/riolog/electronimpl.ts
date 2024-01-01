'use strict';
import { dialog } from '@electron/remote';
import { EventEmitter } from 'events';
import { IErrorMessage, IIPCReceiveMessage, IIPCSendMessage, IPrintMessage, IRioConsole, IRioConsoleProvider,
         IWindowProvider, IWindowView, RioConsole } from 'wpilib-riolog';
import { writeFileAsync } from '../utilities';

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

  public async handleSave(saveData: (IPrintMessage | IErrorMessage)[]): Promise<boolean> {
    const f = await dialog.showSaveDialog({
      title: 'Select a file to save to',
    });

    const file = f.filePath;

    console.log(file);

    if (file === undefined) {
      return false;
    }

    await writeFileAsync(file, JSON.stringify(saveData, null, 4), 'utf8');

    return true;
  }

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
