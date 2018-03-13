'use strict';

import { onConnect, onDisconnect, addMessage } from './sharedscript';
import { IIPCReceiveMessage, IIPCSendMessage, SendTypes } from '../interfaces';
import { IPrintMessage, IErrorMessage } from '../message';

export function checkResize() {
    const allowedHeight = document.documentElement.clientHeight - 80;
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const listHeight = ul.clientHeight;
    if (listHeight < allowedHeight) {
        ul.style.position = 'fixed';
        ul.style.bottom = '80px';
    } else {
        ul.style.position = 'static';
        ul.style.bottom = 'auto';
    }
}

export function sendMessage(message: IIPCReceiveMessage) {
    window.parent.postMessage(message, '*');
}

window.addEventListener('message', event => {
    const data: IIPCSendMessage = event.data;
    switch (data.type) {
        case SendTypes.New:
            addMessage(<IPrintMessage | IErrorMessage>data.message);
            document.body.scrollTop = document.body.scrollHeight;
            break;
        case SendTypes.Batch:
            for (const message of <(IPrintMessage | IErrorMessage)[]>data.message) {
                addMessage(message);
            }
            document.body.scrollTop = document.body.scrollHeight;
            break;
        case SendTypes.PauseUpdate:
            const pause = document.getElementById('pause');
            if (pause !== null) {
                pause.innerHTML = 'Paused: ' + <number>data.message;
            }
            break;
        case SendTypes.ConnectionChanged:
            const bMessage: boolean = <boolean>data.message;
            if (bMessage === true) {
                onConnect();
            } else {
                onDisconnect();
            }
            break;
        default:
            break;
    }
    checkResize();
});
