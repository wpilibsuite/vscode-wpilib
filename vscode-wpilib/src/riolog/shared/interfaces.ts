'use strict';

import { EventEmitter } from 'events';
import { IErrorMessage, IPrintMessage } from './message';

export enum SendTypes {
  Batch,
  ConnectionChanged,
  PauseUpdate,
  New,
}

export interface IIPCSendMessage {
  type: SendTypes;
  message: IPrintMessage | IErrorMessage | (IPrintMessage | IErrorMessage)[] | boolean | number;
}

export enum ReceiveTypes {
  Discard,
  Pause,
  Save,
  Reconnect,
  ChangeNumber,
}

export interface IIPCReceiveMessage {
  type: ReceiveTypes;
  message: boolean | string[] | number;
}

export interface IDisposable {
  dispose(): unknown;
}

export interface IRioConsole extends EventEmitter, IDisposable {
  connected: boolean;
  discard: boolean;
  stop(): void;
  startListening(): void;
  setAutoReconnect(autoReconnect: boolean): void;
  getAutoReconnect(): boolean;
  setTeamNumber(teamNumber: number): void;

  addListener(event: string, listener: (...args: unknown[]) => void): this;
  addListener(event: 'message', listener: (message: IIPCSendMessage) => void): this;
  addListener(event: 'connectionChanged', listener: (connected: boolean) => void): this;

  on(event: string, listener: (...args: unknown[]) => void): this;
  on(event: 'message', listener: (message: IPrintMessage | IErrorMessage) => void): this;
  on(event: 'connectionChanged', listener: (connected: boolean) => void): this;

  emit(event: string | symbol, ...args: unknown[]): boolean;
  emit(event: 'message', message: IPrintMessage | IErrorMessage): boolean;
  emit(event: 'connectionChanged', connected: boolean): boolean;

  disconnect(): void;
}
