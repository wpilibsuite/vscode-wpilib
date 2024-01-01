'use strict';

import { IDisposable, IIPCReceiveMessage, IRioConsole, IRioConsoleProvider, IWindowProvider, IWindowView, ReceiveTypes, SendTypes } from './interfaces';
import { IErrorMessage, IPrintMessage } from './message';

export class RioLogWindow {
  private webview: IWindowView | undefined = undefined;
  private rioConsole: IRioConsole | undefined = undefined;
  private running: boolean = false;
  private disposables: IDisposable[] = [];
  private pausedArray: (IPrintMessage | IErrorMessage)[] = [];
  private paused: boolean = false;
  private hiddenArray: (IPrintMessage | IErrorMessage)[] = [];
  private windowProvider: IWindowProvider;
  private rioConsoleProvider: IRioConsoleProvider;

  constructor(windowProv: IWindowProvider, rioConProivder: IRioConsoleProvider) {
    this.windowProvider = windowProv;
    this.rioConsoleProvider = rioConProivder;
  }

  public start(teamNumber: number) {
    if (this.running) {
      return;
    }
    this.running = true;
    this.createWebView();
    this.createRioConsole();
    if (this.webview === undefined || this.rioConsole === undefined) {
      return;
    }
    this.webview.on('didDispose', () => {
      if (this.rioConsole !== undefined) {
        this.rioConsole.stop();
        this.rioConsole.removeAllListeners();
      }
      this.rioConsole = undefined;
      this.webview = undefined;
      this.running = false;
    });

    this.webview.on('didReceiveMessage', async (data: IIPCReceiveMessage) => {
      await this.onMessageReceived(data);
    });

    this.rioConsole.on('connectionChanged', async (c: boolean) => {
      await this.onConnectionChanged(c);
    });

    this.rioConsole.on('message', async (message: IPrintMessage | IErrorMessage) => {
      await this.onNewMessageToSend(message);
    });

    this.rioConsole.setTeamNumber(teamNumber);
    this.rioConsole.startListening();
  }

  public stop() {
    if (this.webview !== undefined) {
      this.webview.dispose();
    }
  }

  public dispose() {
    this.stop();
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private createWebView() {
    this.webview = this.windowProvider.createWindowView();
    this.webview.on('windowActive', async () => {
      if (this.webview === undefined) {
        return;
      }
      // Window goes active.
      await this.webview.postMessage({
        message: this.hiddenArray,
        type: SendTypes.Batch,
      });
      if (this.rioConsole !== undefined) {
        if (this.rioConsole.connected === true) {
          await this.webview.postMessage({
            message: true,
            type: SendTypes.ConnectionChanged,
          });
        } else {
          await this.webview.postMessage({
            message: false,
            type: SendTypes.ConnectionChanged,
          });
        }
      }
    });
  }

  private createRioConsole() {
    this.rioConsole = this.rioConsoleProvider.getRioConsole();
  }

  private async sendPaused() {
    if (this.webview === undefined) {
      return;
    }
    const success = await this.webview.postMessage({
      message: this.pausedArray,
      type: SendTypes.Batch,
    });
    if (!success) {
      this.hiddenArray.push(...this.pausedArray);
    }
    this.pausedArray = [];
  }

  private async onConnectionChanged(connected: boolean) {
    if (this.webview === undefined) {
      return;
    }
    if (connected) {
      await this.webview.postMessage({
        message: true,
        type: SendTypes.ConnectionChanged,
      });
    } else {
      await this.webview.postMessage({
        message: false,
        type: SendTypes.ConnectionChanged,
      });
    }
  }

  private async onNewMessageToSend(message: IPrintMessage | IErrorMessage) {
    if (this.webview === undefined) {
      return;
    }
    if (this.paused === true) {
      this.pausedArray.push(message);
      await this.webview.postMessage({
        message: this.pausedArray.length,
        type: SendTypes.PauseUpdate,
      });
    } else {
      const success = await this.webview.postMessage({
        message,
        type: SendTypes.New,

      });
      if (!success) {
        this.hiddenArray.push(message);
      }
    }
  }

  private async onMessageReceived(data: IIPCReceiveMessage): Promise<void> {
    if (this.rioConsole === undefined) {
      return;
    }
    if (data.type === ReceiveTypes.Discard) {
      this.rioConsole.discard = data.message as boolean;
    } else if (data.type === ReceiveTypes.Pause) {
      const old = this.paused;
      this.paused = data.message as boolean;
      if (old === true && this.paused === false) {
        await this.sendPaused();
      }
    } else if (data.type === ReceiveTypes.Save) {
      if (this.webview === undefined) {
        return;
      }
      const deserializedLogs: (IPrintMessage | IErrorMessage)[] = [];
      for (const d of data.message as string[]) {
        const parsed = JSON.parse(d);
        deserializedLogs.push(parsed as IPrintMessage | IErrorMessage);
      }
      await this.webview.handleSave(deserializedLogs);
    } else if (data.type === ReceiveTypes.Reconnect) {
      const newValue = data.message as boolean;
      this.rioConsole.setAutoReconnect(newValue);
      if (newValue === false) {
        this.rioConsole.disconnect();
      }
    } else if (data.type === ReceiveTypes.ChangeNumber) {
      const number = data.message as number;
      console.log('setting team number');
      this.rioConsole.setTeamNumber(number);
    }
  }
}
