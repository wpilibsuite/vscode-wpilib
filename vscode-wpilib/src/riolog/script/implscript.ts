'use strict';

import { IIPCReceiveMessage, IIPCSendMessage } from 'wpilib-riolog';
import { checkResizeImpl, handleMessage } from '../shared/sharedscript';

interface IVsCodeApi {
  postMessage(message: IIPCReceiveMessage, to: string): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

export function checkResize() {
  checkResizeImpl(document.documentElement);
}

export function scrollImpl() {
  document.body.scrollTop = document.body.scrollHeight;
}

export function sendMessage(message: IIPCReceiveMessage) {
  vscode.postMessage(message, '*');
}

window.addEventListener('message', (event) => {
  const data: IIPCSendMessage = event.data as IIPCSendMessage;
  handleMessage(data);
});
