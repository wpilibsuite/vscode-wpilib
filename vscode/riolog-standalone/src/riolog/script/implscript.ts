'use strict';

let ipcRenderer = require('electron').ipcRenderer;

import { checkResizeImpl, handleMessage } from '../shared/sharedscript';
import { IIPCReceiveMessage, IIPCSendMessage } from '../shared/interfaces';

export function checkResize() {
    checkResizeImpl(document.body);
}

export function sendMessage(message: IIPCReceiveMessage) {
    ipcRenderer.send('messageToMain', message);
}

ipcRenderer.on('messageFromMain', (_:any, data: IIPCSendMessage) => {
    handleMessage(data);
});
