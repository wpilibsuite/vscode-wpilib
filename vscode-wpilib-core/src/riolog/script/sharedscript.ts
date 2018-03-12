'use strict';

import { sendMessage, checkResize } from './implscript';
import { IPrintMessage, IErrorMessage, MessageType } from '../message';
import { ReceiveTypes } from '../interfaces';

let paused = false;
export function onPause() {
    if (paused === true) {
        paused = false;
        document.getElementById('pause')!.innerHTML = 'Pause';
        sendMessage({
            type: ReceiveTypes.Pause,
            message: false
        });
    } else {
        paused = true;
        document.getElementById('pause')!.innerHTML = 'Paused: 0';
        sendMessage({
            type: ReceiveTypes.Pause,
            message: true
        });
    }
}

let discard = false;
export function onDiscard() {
    if (discard === true) {
        discard = false;
        document.getElementById('discard')!.innerHTML = 'Discard';
        sendMessage({
            type: ReceiveTypes.Discard,
            message: false
        });
    } else {
        discard = true;
        document.getElementById('discard')!.innerHTML = 'Resume';
        sendMessage({
            type: ReceiveTypes.Discard,
            message: true
        });
    }
}

export function onClear() {
    document.getElementById('list')!.innerHTML = '';
}

let showWarnings = true;
export function onShowWarnings() {
    if (showWarnings === true) {
        showWarnings = false;
        document.getElementById('showwarnings')!.innerHTML = 'Show Warnings';
    } else {
        showWarnings = true;
        document.getElementById('showwarnings')!.innerHTML = 'Don\'t Show Warnings';
    }
    let ul = document.getElementById('list');
    let items = ul!.getElementsByTagName('li');
    for (let i = 0; i < items.length; ++i) {
        if (items[i].dataset.type === 'warning') {
            if (showWarnings === true) {
                items[i].style.display = 'inline';
            } else {
                items[i].style.display = 'none';
            }
        }
    }
    checkResize();
}

let showPrints = true;
export function onShowPrints() {
    if (showPrints === true) {
        showPrints = false;
        document.getElementById('showprints')!.innerHTML = 'Show Prints';
    } else {
        showPrints = true;
        document.getElementById('showprints')!.innerHTML = 'Don\'t Show Prints';
    }
    let ul = document.getElementById('list');
    let items = ul!.getElementsByTagName('li');
    for (let i = 0; i < items.length; ++i) {
        if (items[i].dataset.type === 'print') {
            if (showPrints === true) {
                items[i].style.display = 'inline';
            } else {
                items[i].style.display = 'none';
            }
        }
    }
    checkResize();
}

let autoReconnect = true;
export function onAutoReconnect() {
    if (autoReconnect === true) {
        autoReconnect = false;
        document.getElementById('autoreconnect')!.innerHTML = 'Reconnect';
        // send a disconnect
        sendMessage({
            type: ReceiveTypes.Reconnect,
            message: false
        });
    } else {
        autoReconnect = true;
        document.getElementById('autoreconnect')!.innerHTML = 'Disconnect';
        sendMessage({
            type: ReceiveTypes.Reconnect,
            message: true
        });
    }
}

let showTimestamps = false;
export function onShowTimestamps() {
    if (showTimestamps === true) {
        showTimestamps = false;
        document.getElementById('timestamps')!.innerHTML = 'Show Timestamps';
    } else {
        showTimestamps = true;
        document.getElementById('timestamps')!.innerHTML = 'Don\'t Show Timestamps';
    }
    let ul = document.getElementById('list');
    let items = ul!.getElementsByTagName('li');
    for (let i = 0; i < items.length; ++i) {
        let spans = items[i].getElementsByTagName('span');
        if (spans === undefined) {
            continue;
        }
        for (let j = 0; j < spans.length; j++) {
            let span = spans[j];
            if (span.hasAttribute('data-timestamp')) {
                if (showTimestamps === true) {
                    span.style.display = 'inline';
                } else {
                    span.style.display = 'none';
                }
            }
        }
    }
    checkResize();
}

export function onSaveLog() {
    let ul = document.getElementById('list');
    let items = ul!.getElementsByTagName('li');
    let logs: string[] = [];

    for (let i = 0; i < items.length; ++i) {
        logs.push(items[i].dataset.message!);
    }

    sendMessage({
        type: ReceiveTypes.Save,
        message: logs
    });
}

export function onConnect() {
    let button = document.getElementById('autoreconnect');
    button!.style.backgroundColor = 'Green';
}

export function onDisconnect() {
    let button = document.getElementById('autoreconnect');
    button!.style.backgroundColor = 'Red';
}

function insertMessage(ts: number, line: string, li: HTMLLIElement, color?: string) {
    let div = document.createElement('div');
    let tsSpan = document.createElement('span');
    tsSpan.appendChild(document.createTextNode(ts.toFixed(3) + ': '));
    tsSpan.dataset.timestamp = 'true';
    if (showTimestamps === true) {
        tsSpan.style.display = 'inline';
    } else {
        tsSpan.style.display = 'none';
    }
    div.appendChild(tsSpan);
    let span = document.createElement('span');
    let split = line.split('\n');
    let first = true;
    for (let item of split) {
        if (item.trim() === '') {
            continue;
        }
        if (first === false) {
            span.appendChild(document.createElement('br'));
        }
        first = false;
        let tNode = document.createTextNode(item);
        span.appendChild(tNode);
    }
    if (color !== undefined) {
        span.style.color = color;
    }
    div.appendChild(span);
    li.appendChild(div);
}

function insertStackTrace(st: string, li: HTMLLIElement, color?: string) {
    let div = document.createElement('div');
    let split = st.split('\n');
    let first = true;
    for (let item of split) {
        if (item.trim() === '') {
            continue;
        }
        if (first === false) {
            div.appendChild(document.createElement('br'));
        }
        first = false;
        let tNode = document.createTextNode('\u00a0\u00a0\u00a0\u00a0 at: ' + item);
        div.appendChild(tNode);
    }
    if (color !== undefined) {
        div.style.color = color;
    }
    li.appendChild(div);
}

function insertLocation(loc: string, li: HTMLLIElement, color?: string) {
    let div = document.createElement('div');
    let split = loc.split('\n');
    let first = true;
    for (let item of split) {
        if (item.trim() === '') {
            continue;
        }
        if (first === false) {
            li.appendChild(document.createElement('br'));
        }
        first = false;
        let tNode = document.createTextNode('\u00a0\u00a0 from: ' + item);
        li.appendChild(tNode);
    }
    if (color !== undefined) {
        div.style.color = color;
    }
    li.appendChild(div);
}

export function addMessage(message: IPrintMessage | IErrorMessage) {
    if (message.messageType === MessageType.Print) {
        addPrint(<IPrintMessage>message);
    } else {
        addError(<IErrorMessage>message);
    }
}

export function addPrint(message: IPrintMessage) {
    let ul = document.getElementById('list');
    let li = document.createElement('li');
    li.style.fontFamily = '"Courier New", Courier, monospace';
    insertMessage(message.timestamp, message.line, li);
    let str = JSON.stringify(message);
    li.dataset.message = str;
    li.dataset.type = 'print';
    if (showPrints === true) {
        li.style.display = 'inline';
    } else {
        li.style.display = 'none';
    }
    ul!.appendChild(li);
}

export function expandError(message: IErrorMessage, li: HTMLLIElement, color?: string) {
    // First append the message
    insertMessage(message.timestamp, message.details, li, color);
    // Then append location, tabbed in once
    insertLocation(message.location, li);
    // Then append stack trace, tabbed in twice
    insertStackTrace(message.callStack, li);
    li.appendChild(document.createElement('br'));
}

export function addError(message: IErrorMessage) {
    let ul = document.getElementById('list');
    let li = document.createElement('li');
    li.style.fontFamily = '"Courier New", Courier, monospace';
    let str = JSON.stringify(message);
    li.dataset.expanded = 'false';
    li.dataset.message = str;
    if (message.messageType === MessageType.Warning) {
        li.dataset.type = 'warning';
        insertMessage(message.timestamp, message.details, li, 'Yellow');
        if (showWarnings === true) {
            li.style.display = 'inline';
        } else {
            li.style.display = 'none';
        }
    } else {
        li.dataset.type = 'error';
        insertMessage(message.timestamp, message.details, li, 'Red');
    }
    li.onclick = () => {
        if (li.dataset.expanded === 'true') {
            // shrink
            li.dataset.expanded = 'false';
            let parsed = JSON.parse(li.dataset.message!);
            li.innerHTML = '';
            if (li.dataset.type === 'warning') {
                insertMessage(parsed.timestamp, parsed.details, li, 'Yellow');
            } else {
                insertMessage(parsed.timestamp, parsed.details, li, 'Red');
            }
        } else {
            // expand
            li.dataset.expanded = 'true';
            let parsed = JSON.parse(li.dataset.message!);
            li.innerHTML = '';
            if (li.dataset.type === 'warning') {
                expandError(parsed, li, 'Yellow');
            } else {
                expandError(parsed, li, 'Red');
            }
        }
        checkResize();
    };
    ul!.appendChild(li);
}

window.addEventListener('resize', () => {
    checkResize();
});

let pauseButton = document.getElementById('pause');
if (pauseButton !== null) {
    pauseButton.addEventListener('click', () => {
        onPause();
    });
}

let discardButton = document.getElementById('discard');
if (discardButton !== null) {
    discardButton.addEventListener('click', () => {
        onDiscard();
    });
}

let clearButton = document.getElementById('clear');
if (clearButton !== null) {
    clearButton.addEventListener('click', () => {
        onClear();
    });
}

let showPrintsButton = document.getElementById('showprints');
if (showPrintsButton !== null) {
    showPrintsButton.addEventListener('click', () => {
        onShowPrints();
    });
}

let showWarningsButton = document.getElementById('showwarnings');
if (showWarningsButton !== null) {
    showWarningsButton.addEventListener('click', () => {
        onShowWarnings();
    });
}


let autoReconnectButton = document.getElementById('autoreconnect');
if (autoReconnectButton !== null) {
    autoReconnectButton.addEventListener('click', () => {
        onAutoReconnect();
    });
}

let timestampsButton = document.getElementById('timestamps');
if (timestampsButton !== null) {
    timestampsButton.addEventListener('click', () => {
        onShowTimestamps();
    });
}

let saveLogButton = document.getElementById('savelog');
if (saveLogButton !== null) {
    saveLogButton.addEventListener('click', () => {
        onSaveLog();
    });
}
