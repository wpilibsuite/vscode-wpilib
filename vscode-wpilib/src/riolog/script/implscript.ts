'use strict';

import { IIPCReceiveMessage, IIPCSendMessage } from '../shared/interfaces';
import { setImplFunctions, handleMessage } from '../shared/sharedscript';

interface IVsCodeApi {
  postMessage(message: IIPCReceiveMessage, to: string): void;
}

declare function acquireVsCodeApi(): IVsCodeApi;

const vscode = acquireVsCodeApi();

export function checkResize(): void {
  // Get required elements
  const toolbar = document.getElementById('toolbar');
  const logContainer = document.getElementById('log-container');

  // Apply dynamic max-height calculation if both elements exist
  if (toolbar && logContainer) {
    logContainer.style.maxHeight = `calc(100vh - ${toolbar.offsetHeight}px)`;
  }
}

export function scrollImpl() {
  const logContainer = document.getElementById('log-container');
  if (logContainer) {
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

export function sendMessage(message: IIPCReceiveMessage) {
  vscode.postMessage(message, '*');
}

// Register the implementation functions with the shared module
console.log('Setting impl functions');
setImplFunctions(checkResize, scrollImpl, sendMessage);

window.addEventListener('message', (event) => {
  const data: IIPCSendMessage | any = event.data;
  handleMessage(data);
  checkResize();
});

// Listen for window resize events
window.addEventListener('resize', checkResize);

// Initialize everything once loaded
window.addEventListener('load', () => setTimeout(checkResize, 100));
