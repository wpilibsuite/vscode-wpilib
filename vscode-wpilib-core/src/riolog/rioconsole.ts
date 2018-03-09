'use strict';
import * as net from 'net';
import * as timers from 'timers';
import { connectToRobot } from './rioconnector';
import { PrintMessage, ErrorMessage, IMessage, MessageType } from './message';

function delay(ms: number): Promise<void> {
  return new Promise((resolve, _) => {
    timers.setTimeout(() => {
      resolve();
    }, ms);
  });
}

export class RioConsole {
  private autoReconnect: boolean = true;
  private cleanup: boolean = false;
  private doReconnect: boolean = false;
  private discard: boolean = false;
  private paused: boolean = false;
  private showWarning: boolean = true;
  private showPrint: boolean = true;
  private callback: ((message: IMessage) => void) | undefined;
  promise: Promise<void> | undefined;
  private closeFunc: (() => void) | undefined;

  stop(): void {
    this.cleanup = true;
    this.closeSocket();
  }

  reconnect(): void {
    this.doReconnect = true;
    this.closeSocket();
  }

  getAutoReconnect(): boolean {
    return this.autoReconnect;
  }

  setAutoReconnect(value: boolean): void {
    this.autoReconnect = value;
    // TODO. Ping wakeup
  }

  getPaused(): boolean {
    return this.paused;
  }

  setPaused(value: boolean): void {
    this.paused = value;
  }

  getDiscard(): boolean {
    return this.discard;
  }

  setDiscard(value: boolean): void {
    this.discard = value;
  }

  getShowWarning(): boolean {
    return this.showWarning;
  }

  setShowWarning(value: boolean): void {
    this.showWarning = value;
  }

  getShowPrint(): boolean {
    return this.showPrint;
  }

  setShowPrint(value: boolean): void {
    this.showPrint = value;
  }

  addListener(callback: (message: IMessage) => void) {
    this.callback = callback;
  }

  clearListener() {
    this.callback = undefined;
  }

  private async connect(teamNumber: number): Promise<net.Socket | undefined> {
    let socket = await connectToRobot(1741, teamNumber, 2000);
    if (socket === undefined) {
      return undefined;
    }
    socket.setNoDelay(true).setKeepAlive(true, 500);
    return socket;
  }

  private handleData(data: Buffer) {
    if (this.discard) {
      return;
    }

    let count = 0;
    let len = 0;
    do {
      len = data.readUInt16BE(count);
      count += 2;
    } while (len === 0);

    let tag = data.readUInt8(count);
    count++;

    let outputBuffer = data.slice(3, len + 2);

    let extendedBuf = data.slice(2 + len);

    if (tag === 11) {
      // error or warning.
      let m = new ErrorMessage(outputBuffer);

      if (this.callback !== undefined) {
        let mType = m.getMessageType();
        if (mType === MessageType.Error || (mType === MessageType.Warning && this.showWarning)) {
          this.callback(m);
        }
      }
    } else if (tag === 12 && this.showPrint) {
      let m = new PrintMessage(outputBuffer);
      if (this.callback !== undefined) {
        this.callback(m);
      }
    }

    if (extendedBuf.length > 0) {
      this.handleData(extendedBuf);
    }
  }

  private async runFunction(teamNumber: number): Promise<void> {
    let socket = await this.connect(teamNumber);
    if (socket === undefined) {
      console.log('bad socket');
      return;
    }
    socket.on('data', (data) => {
      this.handleData(data);
    });
    if (this.cleanup) {
      socket.end();
      socket.destroy();
      return;
    }
    await new Promise((resolve, _) => {
      this.closeFunc = () => {
        socket!.end();
        socket!.destroy();
        resolve();
      };
      socket!.on('close', () => {
        resolve();
      });
    });
  }

  startListening(teamNumber: number): void {
    let asyncFunction = async () => {
      while (!this.cleanup) {
        let oldR = this.doReconnect;
        this.doReconnect = false;
        if (oldR) {
          while(!this.autoReconnect) {
            if (this.cleanup) {
              return;
            }
            await delay(1000);
          }
        }
        await this.runFunction(teamNumber);
      }
    };
    this.promise = asyncFunction();
  }

  private closeSocket() {
    if (this.closeFunc !== undefined) {
      this.closeFunc();
    }
  }

  async dispose() {
    this.stop();
    await this.promise;
  }
}
