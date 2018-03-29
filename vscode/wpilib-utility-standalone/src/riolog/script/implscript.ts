'use strict';

const remote = require('electron').remote;

import { checkResizeImpl, handleMessage } from '../shared/sharedscript';
import { IIPCReceiveMessage } from '../shared/interfaces';
import { RioLogWindow } from '../shared/riologwindow';
import { RioLogWebviewProvider, LiveRioConsoleProvider, RioLogWindowView } from '../electronimpl';

export function checkResize() {
    checkResizeImpl(document.body);
}

const rioLogWindowView = new RioLogWindowView(async (data) => {
    handleMessage(data);
});

export function sendMessage(message: IIPCReceiveMessage) {
    rioLogWindowView.messageToMain(message);
}

document.addEventListener('keydown', function (e) {
    if (e.which === 123) {
        remote.getCurrentWindow().webContents.toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
});

const rioLog = new RioLogWindow(new RioLogWebviewProvider(rioLogWindowView), new LiveRioConsoleProvider());

window.addEventListener('load', () => {
    rioLog.start(9999);
});


window.addEventListener('unload', () => {
    rioLog.dispose();
});
