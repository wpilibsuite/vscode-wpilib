'use strict';
import * as net from 'net';
import * as timers from 'timers';
import { connectToRobot } from './rioconnector';
import { PrintMessage, ErrorMessage } from './message';

export class RioConsole {
  private _cleanup: boolean = false;
  private _reconnect: boolean = false;
  private _discard: boolean = false;
  private callback: ((message: PrintMessage | ErrorMessage) => void) | undefined;
  private promise: Promise<void> | undefined;

  stop(): void {
    this._cleanup = true;
    this.closeSocket();
  }

  reconnect(): void {
    this._reconnect = true;
    this.closeSocket();
  }

  addListener(callback: (message: PrintMessage | ErrorMessage) => void) {
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
    if (this._discard) {
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
        this.callback(m);
      }
    } else if (tag === 12) {
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
    await new Promise((resolve, _) => {
      socket!.on('close', () => {
        resolve();
      });
    });
  }

  startListening(teamNumber: number): void {
    let asyncFunction = async() => {
      while(!this._cleanup) {
        await this.runFunction(teamNumber);
      }
    };
    this.promise = asyncFunction();
  }

  private closeSocket() {

  }

  dispose() {
    this.stop();
  }
}
