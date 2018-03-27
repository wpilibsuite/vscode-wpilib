'use strict';

const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;

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

document.addEventListener('keydown', function (e) {
    if (e.which === 123) {
      remote.getCurrentWindow().webContents.toggleDevTools();
    } else if (e.which === 116) {
      location.reload();
    }
  });
