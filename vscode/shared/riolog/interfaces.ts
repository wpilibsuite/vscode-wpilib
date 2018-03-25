'use strict';

import { EventEmitter } from 'events';
import { IPrintMessage, IErrorMessage } from './message';

export enum SendTypes {
    Batch,
    ConnectionChanged,
    PauseUpdate,
    New
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
    ChangeNumber
}

export interface IIPCReceiveMessage {
    type: ReceiveTypes;
    message: boolean | string[] | number;
}

export interface IWindowProvider {
    createWindowView(): IWindowView;
}

export interface IWindowView extends EventEmitter, IDisposable {
    postMessage(message: IIPCSendMessage): Promise<boolean>;
    handleSave(saveData: (IPrintMessage | IErrorMessage)[]): Promise<boolean>;

    addListener(event: string, listener: Function): this;
    addListener(event: 'didReceiveMessage', listener: (message: IIPCReceiveMessage) => void): this;
    addListener(event: 'didDispose', listener: () => void): this;
    addListener(event: 'windowActive', listener: () => void): this;

    on(event: string, listener: Function): this;
    on(event: 'didReceiveMessage', listener: (message: IIPCReceiveMessage) => void): this;
    on(event: 'didDispose', listener: () => void): this;
    on(event: 'windowActive', listener: () => void): this;

    // tslint:disable-next-line:no-any
    emit(event: string | symbol, ...args: any[]): boolean;
    emit(event: 'didReceiveMessage', message: IIPCReceiveMessage): boolean;
    emit(event: 'didDispose'): boolean;
    emit(event: 'windowActive'): boolean;
}

export interface IDisposable {
    // tslint:disable-next-line:no-any
    dispose(): any;
}

export interface IRioConsole extends EventEmitter, IDisposable {
    connected: boolean;
    discard: boolean;
    stop(): void;
    startListening(): void;
    setAutoReconnect(autoReconnect: boolean): void;
    getAutoReconnect(): boolean;
    setTeamNumber(teamNumber: number): void;

    addListener(event: string, listener: Function): this;
    addListener(event: 'message', listener: (message: IIPCSendMessage) => void): this;
    addListener(event: 'connectionChanged', listener: (connected: boolean) => void): this;

    on(event: string, listener: Function): this;
    on(event: 'message', listener: (message: IIPCSendMessage) => void): this;
    on(event: 'connectionChanged', listener: (connected: boolean) => void): this;

    // tslint:disable-next-line:no-any
    emit(event: string | symbol, ...args: any[]): boolean;
    emit(event: 'message', message: IPrintMessage | IErrorMessage): boolean;
    emit(event: 'connectionChanged', connected: boolean): boolean;

    disconnect(): void;
}

export interface IRioConsoleProvider {
    getRioConsole(): IRioConsole;
}
