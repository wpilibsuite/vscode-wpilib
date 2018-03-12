'use strict';

import { onConnect, onDisconnect, addMessage } from './sharedscript';
import { IIPCReceiveMessage, IIPCSendMessage, SendTypes } from '../interfaces';
import { IPrintMessage, IErrorMessage } from '../message';

export function checkResize() {
    let allowedHeight = document.documentElement.clientHeight - 80;
    let ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    let listHeight = ul.clientHeight;
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
    let data: IIPCSendMessage = event.data;
    switch (data.type) {
        case SendTypes.New:
            addMessage(<IPrintMessage | IErrorMessage>data.message);
            document.body.scrollTop = document.body.scrollHeight;
            break;
        case SendTypes.Batch:
            for (let message of <(IPrintMessage | IErrorMessage)[]>data.message) {
                addMessage(message);
            }
            document.body.scrollTop = document.body.scrollHeight;
            break;
        case SendTypes.PauseUpdate:
            let pause = document.getElementById('pause');
            if (pause !== null) {
                pause.innerHTML = 'Paused: ' + <number>data.message;
            }
            break;
        case SendTypes.ConnectionChanged:
            let bMessage: boolean = <boolean>data.message;
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
