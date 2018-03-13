'use strict';

import { IPrintMessage, IErrorMessage } from './message';
import { IWindowView, IDisposable, IWindowProvider, IRioConsole, IRioConsoleProvider, IIPCReceiveMessage, SendTypes, ReceiveTypes } from './interfaces';

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

  private createWebView() {
    this.webview = this.windowProvider.createWindowView();
    this.webview.on('windowActive', async () => {
      if (this.webview === undefined) {
        return;
      }
      // Window goes active.
      await this.webview.postMessage({
        type: SendTypes.Batch,
        message: this.hiddenArray
      });
      if (this.rioConsole !== undefined) {
        if (this.rioConsole.connected === true) {
          await this.webview.postMessage({
            type: SendTypes.ConnectionChanged,
            message: true
          });
        } else {
          await this.webview.postMessage({
            type: SendTypes.ConnectionChanged,
            message: false
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
      type: SendTypes.Batch,
      message: this.pausedArray
    });
    if (!success) {
      this.hiddenArray.push(...this.pausedArray);
    }
    this.pausedArray = [];
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
      this.onMessageReceived(data);
    });

    this.rioConsole.on('connectionChanged', async (c: boolean) => {
      this.onConnectionChanged(c);
    });

    this.rioConsole.on('message', (message: IPrintMessage | IErrorMessage) => {
      this.onNewMessageToSend(message);
    });

    this.rioConsole.startListening(teamNumber);
  }

  private async onConnectionChanged(connected: boolean) {
    if (this.webview === undefined) {
      return;
    }
    if (connected) {
      await this.webview.postMessage({
        type: SendTypes.ConnectionChanged,
        message: true
      });
    } else {
      await this.webview.postMessage({
        type: SendTypes.ConnectionChanged,
        message: false
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
        type: SendTypes.PauseUpdate,
        message: this.pausedArray.length
      });
    } else {
      const success = await this.webview.postMessage({
        type: SendTypes.New,
        message: message
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
      if (<boolean>data.message === false) {
        this.rioConsole.discard = false;
      } else {
        this.rioConsole.discard = true;
      }
    } else if (data.type === ReceiveTypes.Pause) {
      const old = this.paused;
      this.paused = <boolean>data.message;
      if (old === true && this.paused === false) {
        await this.sendPaused();
      }
    } else if (data.type === ReceiveTypes.Save) {
      if (this.webview === undefined) {
        return;
      }
      const deserializedLogs: (IPrintMessage | IErrorMessage)[] = [];
      for (const d of <string[]>data.message) {
        const parsed = JSON.parse(d);
        deserializedLogs.push(parsed);
      }
      await this.webview.handleSave(deserializedLogs);
    } else if (data.type === ReceiveTypes.Reconnect) {
      const newValue = <boolean>data.message;
      this.rioConsole.setAutoReconnect(newValue);
      if (newValue === false) {
        this.rioConsole.disconnect();
      }
    }
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
}
