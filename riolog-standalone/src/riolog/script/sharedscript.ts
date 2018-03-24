'use strict';

import { sendMessage, checkResize } from './implscript';
import { IPrintMessage, IErrorMessage, MessageType } from '../message';
import { ReceiveTypes } from '../interfaces';

let paused = false;
export function onPause() {
    const pauseElement = document.getElementById('pause');
    if (pauseElement === null) {
        return;
    }
    if (paused === true) {
        paused = false;
        pauseElement.innerHTML = 'Pause';
        sendMessage({
            type: ReceiveTypes.Pause,
            message: false
        });
    } else {
        paused = true;
        pauseElement.innerHTML = 'Paused: 0';
        sendMessage({
            type: ReceiveTypes.Pause,
            message: true
        });
    }
}

let discard = false;
export function onDiscard() {
    const dButton = document.getElementById('discard');
    if (dButton === null) {
        return;
    }
    if (discard === true) {
        discard = false;
        dButton.innerHTML = 'Discard';
        sendMessage({
            type: ReceiveTypes.Discard,
            message: false
        });
    } else {
        discard = true;
        dButton.innerHTML = 'Resume';
        sendMessage({
            type: ReceiveTypes.Discard,
            message: true
        });
    }
}

export function onClear() {
    const list = document.getElementById('list');
    if (list === null) {
        return;
    }
    list.innerHTML = '';
}

let showWarnings = true;
export function onShowWarnings() {
    const warningsButton = document.getElementById('showwarnings');
    if (warningsButton === null) {
        return;
    }
    if (showWarnings === true) {
        showWarnings = false;
        warningsButton.innerHTML = 'Show Warnings';
    } else {
        showWarnings = true;
        warningsButton.innerHTML = 'Don\'t Show Warnings';
    }
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const items = ul.getElementsByTagName('li');
    // tslint:disable-next-line:prefer-for-of
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
    const printButton = document.getElementById('showprints');
    if (printButton === null) {
        return;
    }
    if (showPrints === true) {
        showPrints = false;
        printButton.innerHTML = 'Show Prints';
    } else {
        showPrints = true;
        printButton.innerHTML = 'Don\'t Show Prints';
    }
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const items = ul.getElementsByTagName('li');
    // tslint:disable-next-line:prefer-for-of
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
    const arButton = document.getElementById('autoreconnect');
    if (arButton === null) {
        return;
    }
    if (autoReconnect === true) {
        autoReconnect = false;
        arButton.innerHTML = 'Reconnect';
        // send a disconnect
        sendMessage({
            type: ReceiveTypes.Reconnect,
            message: false
        });
    } else {
        autoReconnect = true;
        arButton.innerHTML = 'Disconnect';
        sendMessage({
            type: ReceiveTypes.Reconnect,
            message: true
        });
    }
}

let showTimestamps = false;
export function onShowTimestamps() {
    const tsButton = document.getElementById('timestamps');
    if (tsButton === null) {
        return;
    }
    if (showTimestamps === true) {
        showTimestamps = false;
        tsButton.innerHTML = 'Show Timestamps';
    } else {
        showTimestamps = true;
        tsButton.innerHTML = 'Don\'t Show Timestamps';
    }
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const items = ul.getElementsByTagName('li');
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < items.length; ++i) {
        const spans = items[i].getElementsByTagName('span');
        if (spans === undefined) {
            continue;
        }
        // tslint:disable-next-line:prefer-for-of
        for (let j = 0; j < spans.length; j++) {
            const span = spans[j];
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
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const items = ul.getElementsByTagName('li');
    const logs: string[] = [];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < items.length; ++i) {
        const m = items[i].dataset.message;
        if (m === undefined) {
            return;
        }
        logs.push(m);
    }

    sendMessage({
        type: ReceiveTypes.Save,
        message: logs
    });
}

export function onConnect() {
    const button = document.getElementById('autoreconnect');
    if (button === null) {
        return;
    }
    button.style.backgroundColor = 'Green';
}

export function onDisconnect() {
    const button = document.getElementById('autoreconnect');
    if (button === null) {
        return;
    }
    button.style.backgroundColor = 'Red';
}

function insertMessage(ts: number, line: string, li: HTMLLIElement, color?: string) {
    const div = document.createElement('div');
    const tsSpan = document.createElement('span');
    tsSpan.appendChild(document.createTextNode(ts.toFixed(3) + ': '));
    tsSpan.dataset.timestamp = 'true';
    if (showTimestamps === true) {
        tsSpan.style.display = 'inline';
    } else {
        tsSpan.style.display = 'none';
    }
    div.appendChild(tsSpan);
    const span = document.createElement('span');
    const split = line.split('\n');
    let first = true;
    for (const item of split) {
        if (item.trim() === '') {
            continue;
        }
        if (first === false) {
            span.appendChild(document.createElement('br'));
        }
        first = false;
        const tNode = document.createTextNode(item);
        span.appendChild(tNode);
    }
    if (color !== undefined) {
        span.style.color = color;
    }
    div.appendChild(span);
    li.appendChild(div);
}

function insertStackTrace(st: string, li: HTMLLIElement, color?: string) {
    const div = document.createElement('div');
    const split = st.split('\n');
    let first = true;
    for (const item of split) {
        if (item.trim() === '') {
            continue;
        }
        if (first === false) {
            div.appendChild(document.createElement('br'));
        }
        first = false;
        const tNode = document.createTextNode('\u00a0\u00a0\u00a0\u00a0 at: ' + item);
        div.appendChild(tNode);
    }
    if (color !== undefined) {
        div.style.color = color;
    }
    li.appendChild(div);
}

function insertLocation(loc: string, li: HTMLLIElement, color?: string) {
    const div = document.createElement('div');
    const split = loc.split('\n');
    let first = true;
    for (const item of split) {
        if (item.trim() === '') {
            continue;
        }
        if (first === false) {
            li.appendChild(document.createElement('br'));
        }
        first = false;
        const tNode = document.createTextNode('\u00a0\u00a0 from: ' + item);
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
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const li = document.createElement('li');
    li.style.fontFamily = 'Consolas, "Courier New", monospace';
    insertMessage(message.timestamp, message.line, li);
    const str = JSON.stringify(message);
    li.dataset.message = str;
    li.dataset.type = 'print';
    if (showPrints === true) {
        li.style.display = 'inline';
    } else {
        li.style.display = 'none';
    }
    ul.appendChild(li);
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
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const li = document.createElement('li');
    li.style.fontFamily = 'Consolas, "Courier New", monospace';
    const str = JSON.stringify(message);
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
            if (li.dataset.message === undefined) {
                return;
            }
            const parsed = JSON.parse(li.dataset.message);
            li.innerHTML = '';
            if (li.dataset.type === 'warning') {
                insertMessage(parsed.timestamp, parsed.details, li, 'Yellow');
            } else {
                insertMessage(parsed.timestamp, parsed.details, li, 'Red');
            }
        } else {
            // expand
            li.dataset.expanded = 'true';
            if (li.dataset.message === undefined) {
                return;
            }
            const parsed = JSON.parse(li.dataset.message);
            li.innerHTML = '';
            if (li.dataset.type === 'warning') {
                expandError(parsed, li, 'Yellow');
            } else {
                expandError(parsed, li, 'Red');
            }
        }
        checkResize();
    };
    ul.appendChild(li);
}

window.addEventListener('resize', () => {
    checkResize();
});

// tslint:disable-next-line:no-any
function handleFileSelect(evt: any) {
    const files: FileList = evt.target.files; // filelist
    const firstFile = files[0];
    const reader = new FileReader();
    reader.onload = (loaded: Event) => {
        const target: FileReader = <FileReader>loaded.target;
        const parsed = JSON.parse(target.result);
        for (const p of parsed) {
            addMessage(p);
        }
    };
    reader.readAsText(firstFile);
}

const openFileButton = document.getElementById('open');
if (openFileButton !== null) {
    openFileButton.addEventListener('change', handleFileSelect, false);
}

const pauseButton = document.getElementById('pause');
if (pauseButton !== null) {
    pauseButton.addEventListener('click', () => {
        onPause();
    });
}

const discardButton = document.getElementById('discard');
if (discardButton !== null) {
    discardButton.addEventListener('click', () => {
        onDiscard();
    });
}

const clearButton = document.getElementById('clear');
if (clearButton !== null) {
    clearButton.addEventListener('click', () => {
        onClear();
    });
}

const showPrintsButton = document.getElementById('showprints');
if (showPrintsButton !== null) {
    showPrintsButton.addEventListener('click', () => {
        onShowPrints();
    });
}

const showWarningsButton = document.getElementById('showwarnings');
if (showWarningsButton !== null) {
    showWarningsButton.addEventListener('click', () => {
        onShowWarnings();
    });
}


const autoReconnectButton = document.getElementById('autoreconnect');
if (autoReconnectButton !== null) {
    autoReconnectButton.addEventListener('click', () => {
        onAutoReconnect();
    });
}

const timestampsButton = document.getElementById('timestamps');
if (timestampsButton !== null) {
    timestampsButton.addEventListener('click', () => {
        onShowTimestamps();
    });
}

const saveLogButton = document.getElementById('savelog');
if (saveLogButton !== null) {
    saveLogButton.addEventListener('click', () => {
        onSaveLog();
    });
}

const switchPageButton = document.getElementById('switchPage');
if (switchPageButton !== null) {
    switchPageButton.addEventListener('click', () => {
        console.log("Switch pages");
    });
}

const changeTeamNumberButton = document.getElementById('changeTeamNumber');
if (changeTeamNumberButton !== null) {
    changeTeamNumberButton.addEventListener('click', () => {
        const newNumber = document.getElementById('teamNumber');
        console.log('finding team number');
        if (newNumber === null) {
            return;
        }
        console.log('sending message');
        sendMessage({
            type: ReceiveTypes.ChangeNumber,
            message: parseInt((<HTMLInputElement>newNumber).value)
        })
        console.log('sent message');
    });
}
