'use strict';

import { IIPCReceiveMessage, IIPCSendMessage } from '../shared/interfaces';
import { checkResizeImpl, handleMessage } from '../shared/sharedscript';

// tslint:disable-next-line:no-any
declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

export function checkResize() {
  checkResizeImpl(document.documentElement);
}

export function sendMessage(message: IIPCReceiveMessage) {
  // tslint:disable-next-line:no-unsafe-any
  vscode.postMessage(message, '*');
}

window.addEventListener('message', (event) => {
  const data: IIPCSendMessage = event.data as IIPCSendMessage;
  handleMessage(data);
});
