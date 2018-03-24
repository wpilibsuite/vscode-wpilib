'use strict';

import * as net from 'net';
import { connectToRobot } from './rioconnector';
import { PrintMessage, ErrorMessage } from './message';
import { EventEmitter } from 'events';
import { PromiseCondition } from './promisecond';
import { IRioConsole } from './interfaces';

export class RioConsole extends EventEmitter implements IRioConsole {
  private autoReconnect: boolean = true;
  private cleanup: boolean = false;
  public discard: boolean = false;
  public connected: boolean = false;
  private promise: Promise<void> | undefined;
  private condition: PromiseCondition = new PromiseCondition();
  private closeFunc: (() => void) | undefined;
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

  private async connect(teamNumber: number): Promise<net.Socket | undefined> {
    const socket = await connectToRobot(1741, teamNumber, 2000);
    if (socket === undefined) {
      return undefined;
    }
    socket.setNoDelay(true)
    socket.setKeepAlive(true, 500);
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

    const tag = data.readUInt8(count);
    count++;

    const outputBuffer = data.slice(3, len + 2);

    const extendedBuf = data.slice(2 + len);

    if (tag === 11) {
      // error or warning.
      const m = new ErrorMessage(outputBuffer);
      this.emit('message', m);
    } else if (tag === 12) {
      const m = new PrintMessage(outputBuffer);
      this.emit('message', m);
    }

    if (extendedBuf.length > 0) {
      this.handleData(extendedBuf);
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
      this.handleData(data);
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
}
