'use strict';

import { WebviewPanel } from 'vscode';
import { RioConsole } from './rioconsole';
import {
  IDisposable,
  IIPCReceiveMessage,
  IRioConsole,
  ReceiveTypes,
  SendTypes,
} from './shared/interfaces';
import { IErrorMessage, IPrintMessage } from './shared/message';
import { createRioLogWindowView, handleSave } from './vscodeimpl';

export class RioLogWindow {
  private webview: WebviewPanel | undefined = undefined;
  private rioConsole: IRioConsole | undefined = undefined;
  private running: boolean = false;
  private disposables: IDisposable[] = [];
  private pausedArray: (IPrintMessage | IErrorMessage)[] = [];
  private paused: boolean = false;
  private hiddenArray: (IPrintMessage | IErrorMessage)[] = [];
  private resourceRoot: string;

  constructor(resourceRoot: string) {
    this.resourceRoot = resourceRoot;
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
    this.webview.onDidDispose(
      () => {
        if (this.rioConsole) {
          this.rioConsole.stop();
          this.rioConsole.removeAllListeners();
        }
        this.rioConsole = undefined;
        this.webview = undefined;
        this.running = false;
      },
      null,
      this.disposables
    );

    this.webview.webview.onDidReceiveMessage(this.onMessageReceived, this, this.disposables);

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
    if (this.webview) {
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
    this.webview = createRioLogWindowView(this.resourceRoot, this.disposables);
    this.webview?.onDidChangeViewState(
      async (s) => {
        if (this.webview === undefined || !s.webviewPanel.visible) {
          return;
        }
        // Window goes active.
        await this.webview.webview.postMessage({
          message: this.hiddenArray,
          type: SendTypes.Batch,
        });
        if (this.rioConsole) {
          if (this.rioConsole.connected) {
            await this.webview.webview.postMessage({
              message: true,
              type: SendTypes.ConnectionChanged,
            });
          } else {
            await this.webview.webview.postMessage({
              message: false,
              type: SendTypes.ConnectionChanged,
            });
          }
        }
      },
      null,
      this.disposables
    );
  }

  private createRioConsole() {
    this.rioConsole = new RioConsole();
  }

  private async sendPaused() {
    if (this.webview === undefined) {
      return;
    }
    const success = await this.webview.webview.postMessage({
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
      await this.webview.webview.postMessage({
        message: true,
        type: SendTypes.ConnectionChanged,
      });
    } else {
      await this.webview.webview.postMessage({
        message: false,
        type: SendTypes.ConnectionChanged,
      });
    }
  }

  private async onNewMessageToSend(message: IPrintMessage | IErrorMessage) {
    if (this.webview === undefined) {
      return;
    }
    if (this.paused) {
      this.pausedArray.push(message);
      await this.webview.webview.postMessage({
        message: this.pausedArray.length,
        type: SendTypes.PauseUpdate,
      });
    } else {
      const success = await this.webview.webview.postMessage({
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
      if (old && !this.paused) {
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
      await handleSave(deserializedLogs);
    } else if (data.type === ReceiveTypes.Reconnect) {
      const newValue = data.message as boolean;
      this.rioConsole.setAutoReconnect(newValue);
      if (!newValue) {
        this.rioConsole.disconnect();
      }
    } else if (data.type === ReceiveTypes.ChangeNumber) {
      const number = data.message as number;
      console.log('setting team number');
      this.rioConsole.setTeamNumber(number);
    }
  }
}
