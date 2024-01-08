'use strict';

import { EventEmitter } from 'events';
import * as net from 'net';
import { IRioConsole } from './interfaces';
import { ErrorMessage, PrintMessage } from './message';
import { PromiseCondition } from './promisecond';
import { connectToRobot } from './rioconnector';

const maxFrameSize = 100000;

class DataStore {
  // 65536 is max length, plus 2 for the length itself, rounded to the nearest 256
  public buf: Buffer = new Buffer(65792);
  public count: number = 0;
  public frameSize: number = maxFrameSize;
}

export class RioConsole extends EventEmitter implements IRioConsole {
  public discard: boolean = false;
  public connected: boolean = false;
  private autoReconnect: boolean = true;
  private cleanup: boolean = false;
  private promise: Promise<void> | undefined;
  private condition: PromiseCondition = new PromiseCondition();
  private closeFunc: (() => void) | undefined;
  private dataStore: DataStore = new DataStore();
  private teamNumber: number = 0;

  public stop(): void {
    this.cleanup = true;
    this.closeSocket();
  }

  public getAutoReconnect(): boolean {
    return this.autoReconnect;
  }

  public setAutoReconnect(value: boolean): void {
    this.autoReconnect = value;
    if (value === true) {
      this.condition.set();
    }
  }

  public startListening(): void {
    const asyncFunction = async () => {
      while (!this.cleanup) {
        while (!this.autoReconnect) {
          if (this.cleanup) {
            return;
          }
          await this.condition.wait();
          this.condition.reset();
        }
        await this.runFunction(this.teamNumber);
      }
      console.log('finished loop');
    };
    this.promise = asyncFunction();
  }

  public closeSocket() {
    if (this.closeFunc !== undefined) {
      this.closeFunc();
    }
  }

  public disconnect(): void {
    this.closeSocket();
  }

  public setTeamNumber(teamNumber: number): void {
    this.teamNumber = teamNumber;
  }

  public async dispose() {
    this.stop();
    this.removeAllListeners();
    await this.promise;
  }

  private async connect(teamNumber: number): Promise<net.Socket | undefined> {
    const socket = await connectToRobot(1741, teamNumber, 2000);
    if (socket === undefined) {
      return undefined;
    }
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 500);
    return socket;
  }

  handleBuffer(data: Buffer) {
    while (data.length > 0) {
      if (this.dataStore.frameSize === maxFrameSize) {
        if (this.dataStore.count < 2) {
          const toCopy = Math.min(2 - this.dataStore.count, data.length);
          data.copy(this.dataStore.buf, this.dataStore.count, 0, toCopy);
          this.dataStore.count += toCopy;
          data = data.slice(toCopy);
          if (this.dataStore.count < 2) {
            return;
          }
        }
        this.dataStore.frameSize = (this.dataStore.buf[0] << 8) | this.dataStore.buf[1];
      }
      {
        let need = this.dataStore.frameSize - (this.dataStore.count - 2);
        const toCopy = Math.min(need, data.length);
        data.copy(this.dataStore.buf, this.dataStore.count, 0, toCopy);
        this.dataStore.count += toCopy;
        data = data.slice(toCopy);
        need -= toCopy;
        if (need === 0) {
          this.handleData(this.dataStore.buf);
          this.dataStore.count = 0;
          this.dataStore.frameSize = maxFrameSize;
        }
      }
    }
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

    const tag = data.readUInt8(count);
    count++;

    const outputBuffer = data.slice(3, len + 2);

    if (tag === 11) {
      // error or warning.
      const m = new ErrorMessage(outputBuffer);
      this.emit('message', m);
    } else if (tag === 12) {
      const m = new PrintMessage(outputBuffer);
      this.emit('message', m);
    }
  }

  private async runFunction(teamNumber: number): Promise<void> {
    const socket = await this.connect(teamNumber);
    if (socket === undefined) {
      console.log('bad socket');
      return;
    }
    this.connected = true;
    this.emit('connectionChanged', true);
    console.log('succesfully connected');
    socket.on('data', (data) => {
      this.handleBuffer(data);
    });
    if (this.cleanup) {
      socket.end();
      socket.destroy();
      socket.removeAllListeners();
      return;
    }
    await new Promise((resolve, _) => {
      this.closeFunc = () => {
        socket.end();
        socket.destroy();
        socket.removeAllListeners();
        resolve();
        console.log('closed locally');
      };
      socket.on('close', () => {
        socket.removeAllListeners();
        resolve();
        console.log('closed remotely (close)');
      });
      socket.on('end', () => {
        socket.removeAllListeners();
        resolve();
        console.log('closed remotely (end)');
      });
    });
    this.connected = false;
    this.emit('connectionChanged', false);
  }
}
