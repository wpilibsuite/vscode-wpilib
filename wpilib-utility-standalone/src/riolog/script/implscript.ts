'use strict';

import * as electron from 'electron';
import { IIPCReceiveMessage, RioLogWindow } from 'wpilib-riolog';
import { LiveRioConsoleProvider, RioLogWebviewProvider, RioLogWindowView } from '../electronimpl';
import { checkResizeImpl, handleMessage } from '../shared/sharedscript';

const remote = electron.remote;

export function checkResize() {
    checkResizeImpl(document.documentElement);
}

export function scrollImpl() {
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
}

const rioLogWindowView = new RioLogWindowView(async (data) => {
    handleMessage(data);
});

export function sendMessage(message: IIPCReceiveMessage) {
    rioLogWindowView.messageToMain(message);
}

document.addEventListener('keydown', (e) => {
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
