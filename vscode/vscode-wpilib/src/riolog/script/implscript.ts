'use strict';

import { checkResizeImpl, handleMessage } from '../shared/sharedscript';
import { IIPCReceiveMessage, IIPCSendMessage } from '../shared/interfaces';


export function checkResize() {
    checkResizeImpl(document.documentElement);
}

export function sendMessage(message: IIPCReceiveMessage) {
    window.parent.postMessage(message, '*');
}

window.addEventListener('message', event => {
    const data: IIPCSendMessage = event.data;
    handleMessage(data);
});
