'use strict';

import { checkResizeImpl, handleMessage } from '../shared/sharedscript';
import { IIPCReceiveMessage, IIPCSendMessage } from '../shared/interfaces';

// tslint:disable-next-line:no-any
declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

export function checkResize() {
  checkResizeImpl(document.documentElement);
}

export function sendMessage(message: IIPCReceiveMessage) {
  vscode.postMessage(message, '*');
}

window.addEventListener('message', event => {
  const data: IIPCSendMessage = event.data;
  handleMessage(data);
});
