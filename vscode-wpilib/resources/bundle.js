(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const sharedscript_1 = require("../shared/sharedscript");
const vscode = acquireVsCodeApi();
function checkResize() {
    sharedscript_1.checkResizeImpl(document.documentElement);
}
exports.checkResize = checkResize;
function sendMessage(message) {
    // tslint:disable-next-line:no-unsafe-any
    vscode.postMessage(message, '*');
}
exports.sendMessage = sendMessage;
window.addEventListener('message', (event) => {
    const data = event.data;
    sharedscript_1.handleMessage(data);
});

},{"../shared/sharedscript":4}],2:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var SendTypes;
(function (SendTypes) {
    SendTypes[SendTypes["Batch"] = 0] = "Batch";
    SendTypes[SendTypes["ConnectionChanged"] = 1] = "ConnectionChanged";
    SendTypes[SendTypes["PauseUpdate"] = 2] = "PauseUpdate";
    SendTypes[SendTypes["New"] = 3] = "New";
})(SendTypes = exports.SendTypes || (exports.SendTypes = {}));
var ReceiveTypes;
(function (ReceiveTypes) {
    ReceiveTypes[ReceiveTypes["Discard"] = 0] = "Discard";
    ReceiveTypes[ReceiveTypes["Pause"] = 1] = "Pause";
    ReceiveTypes[ReceiveTypes["Save"] = 2] = "Save";
    ReceiveTypes[ReceiveTypes["Reconnect"] = 3] = "Reconnect";
    ReceiveTypes[ReceiveTypes["ChangeNumber"] = 4] = "ChangeNumber";
})(ReceiveTypes = exports.ReceiveTypes || (exports.ReceiveTypes = {}));

},{}],3:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:prefer-conditional-expression */
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Error"] = 0] = "Error";
    MessageType[MessageType["Warning"] = 1] = "Warning";
    MessageType[MessageType["Print"] = 2] = "Print";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
class PrintMessage {
    constructor(data) {
        this.messageType = MessageType.Print;
        let count = 0;
        this.timestamp = data.readFloatBE(count);
        count += 4;
        this.seqNumber = data.readInt16BE(count);
        count += 2;
        const slice = data.slice(count);
        this.line = slice.toString('utf8');
    }
}
exports.PrintMessage = PrintMessage;
class ErrorMessage {
    constructor(data) {
        let count = 0;
        this.timestamp = data.readFloatBE(count);
        count += 4;
        this.seqNumber = data.readInt16BE(count);
        count += 2;
        this.numOccur = data.readInt16BE(count);
        count += 2;
        this.errorCode = data.readInt32BE(count);
        count += 4;
        this.flags = data.readUInt8(count);
        count += 1;
        let tmp = this.getSizedString(data, count);
        this.details = tmp.data;
        count += tmp.byteLength;
        tmp = this.getSizedString(data, count);
        this.location = tmp.data;
        count += tmp.byteLength;
        tmp = this.getSizedString(data, count);
        this.callStack = tmp.data;
        count += tmp.byteLength;
        // tslint:disable-next-line:no-bitwise
        if ((this.flags & 1) !== 0) {
            this.messageType = MessageType.Error;
        }
        else {
            this.messageType = MessageType.Warning;
        }
    }
    getSizedString(data, start) {
        const size = data.readUInt16BE(start);
        start += 2;
        const count = size + 2;
        return {
            byteLength: count,
            data: data.toString('utf8', start, start + count - 2),
        };
    }
}
exports.ErrorMessage = ErrorMessage;

},{}],4:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:prefer-conditional-expression */
const implscript_1 = require("../script/implscript");
const interfaces_1 = require("./interfaces");
const message_1 = require("./message");
let paused = false;
function onPause() {
    const pauseElement = document.getElementById('pause');
    if (pauseElement === null) {
        return;
    }
    if (paused === true) {
        paused = false;
        pauseElement.innerHTML = 'Pause';
        implscript_1.sendMessage({
            message: false,
            type: interfaces_1.ReceiveTypes.Pause,
        });
    }
    else {
        paused = true;
        pauseElement.innerHTML = 'Paused: 0';
        implscript_1.sendMessage({
            message: true,
            type: interfaces_1.ReceiveTypes.Pause,
        });
    }
}
exports.onPause = onPause;
let discard = false;
function onDiscard() {
    const dButton = document.getElementById('discard');
    if (dButton === null) {
        return;
    }
    if (discard === true) {
        discard = false;
        dButton.innerHTML = 'Discard';
        implscript_1.sendMessage({
            message: false,
            type: interfaces_1.ReceiveTypes.Discard,
        });
    }
    else {
        discard = true;
        dButton.innerHTML = 'Resume';
        implscript_1.sendMessage({
            message: true,
            type: interfaces_1.ReceiveTypes.Discard,
        });
    }
}
exports.onDiscard = onDiscard;
function onClear() {
    const list = document.getElementById('list');
    if (list === null) {
        return;
    }
    list.innerHTML = '';
}
exports.onClear = onClear;
let showWarnings = true;
function onShowWarnings() {
    const warningsButton = document.getElementById('showwarnings');
    if (warningsButton === null) {
        return;
    }
    if (showWarnings === true) {
        showWarnings = false;
        warningsButton.innerHTML = 'Show Warnings';
    }
    else {
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
            }
            else {
                items[i].style.display = 'none';
            }
        }
    }
    implscript_1.checkResize();
}
exports.onShowWarnings = onShowWarnings;
let showPrints = true;
function onShowPrints() {
    const printButton = document.getElementById('showprints');
    if (printButton === null) {
        return;
    }
    if (showPrints === true) {
        showPrints = false;
        printButton.innerHTML = 'Show Prints';
    }
    else {
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
            }
            else {
                items[i].style.display = 'none';
            }
        }
    }
    implscript_1.checkResize();
}
exports.onShowPrints = onShowPrints;
let autoReconnect = true;
function onAutoReconnect() {
    if (autoReconnect === true) {
        autoReconnect = false;
        // send a disconnect
        implscript_1.sendMessage({
            message: false,
            type: interfaces_1.ReceiveTypes.Reconnect,
        });
    }
    else {
        autoReconnect = true;
        implscript_1.sendMessage({
            message: true,
            type: interfaces_1.ReceiveTypes.Reconnect,
        });
    }
    const arButton = document.getElementById('autoreconnect');
    if (arButton === null) {
        return;
    }
    if (autoReconnect === true) {
        arButton.innerHTML = 'Reconnect';
    }
    else {
        arButton.innerHTML = 'Disconnect';
    }
}
exports.onAutoReconnect = onAutoReconnect;
let showTimestamps = false;
function onShowTimestamps() {
    const tsButton = document.getElementById('timestamps');
    if (tsButton === null) {
        return;
    }
    if (showTimestamps === true) {
        showTimestamps = false;
        tsButton.innerHTML = 'Show Timestamps';
    }
    else {
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
                }
                else {
                    span.style.display = 'none';
                }
            }
        }
    }
    implscript_1.checkResize();
}
exports.onShowTimestamps = onShowTimestamps;
function onSaveLog() {
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const items = ul.getElementsByTagName('li');
    const logs = [];
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < items.length; ++i) {
        const m = items[i].dataset.message;
        if (m === undefined) {
            return;
        }
        logs.push(m);
    }
    implscript_1.sendMessage({
        message: logs,
        type: interfaces_1.ReceiveTypes.Save,
    });
}
exports.onSaveLog = onSaveLog;
function onConnect() {
    const button = document.getElementById('autoreconnect');
    if (button === null) {
        return;
    }
    button.style.backgroundColor = 'Green';
}
exports.onConnect = onConnect;
function onDisconnect() {
    const button = document.getElementById('autoreconnect');
    if (button === null) {
        return;
    }
    button.style.backgroundColor = 'Red';
}
exports.onDisconnect = onDisconnect;
function insertMessage(ts, line, li, color) {
    const div = document.createElement('div');
    const tsSpan = document.createElement('span');
    tsSpan.appendChild(document.createTextNode(ts.toFixed(3) + ': '));
    tsSpan.dataset.timestamp = 'true';
    if (showTimestamps === true) {
        tsSpan.style.display = 'inline';
    }
    else {
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
function insertStackTrace(st, li, color) {
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
function insertLocation(loc, li, color) {
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
function addMessage(message) {
    if (message.messageType === message_1.MessageType.Print) {
        addPrint(message);
    }
    else {
        addError(message);
    }
}
exports.addMessage = addMessage;
function limitList() {
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    if (ul.childElementCount > 1000 && ul.firstChild !== null) {
        ul.removeChild(ul.firstChild);
    }
}
function addPrint(message) {
    limitList();
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
    }
    else {
        li.style.display = 'none';
    }
    ul.appendChild(li);
}
exports.addPrint = addPrint;
function expandError(message, li, color) {
    // First append the message
    insertMessage(message.timestamp, message.details, li, color);
    // Then append location, tabbed in once
    insertLocation(message.location, li);
    // Then append stack trace, tabbed in twice
    insertStackTrace(message.callStack, li);
    li.appendChild(document.createElement('br'));
}
exports.expandError = expandError;
function addError(message) {
    limitList();
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const li = document.createElement('li');
    li.style.fontFamily = 'Consolas, "Courier New", monospace';
    const str = JSON.stringify(message);
    li.dataset.expanded = 'false';
    li.dataset.message = str;
    if (message.messageType === message_1.MessageType.Warning) {
        li.dataset.type = 'warning';
        insertMessage(message.timestamp, message.details, li, 'Yellow');
        if (showWarnings === true) {
            li.style.display = 'inline';
        }
        else {
            li.style.display = 'none';
        }
    }
    else {
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
            }
            else {
                insertMessage(parsed.timestamp, parsed.details, li, 'Red');
            }
        }
        else {
            // expand
            li.dataset.expanded = 'true';
            if (li.dataset.message === undefined) {
                return;
            }
            const parsed = JSON.parse(li.dataset.message);
            li.innerHTML = '';
            if (li.dataset.type === 'warning') {
                expandError(parsed, li, 'Yellow');
            }
            else {
                expandError(parsed, li, 'Red');
            }
        }
        implscript_1.checkResize();
    };
    ul.appendChild(li);
}
exports.addError = addError;
window.addEventListener('resize', () => {
    implscript_1.checkResize();
});
// tslint:disable-next-line:no-any
function handleFileSelect(evt) {
    // tslint:disable-next-line:no-unsafe-any
    const files = evt.target.files; // filelist
    const firstFile = files[0];
    const reader = new FileReader();
    reader.onload = (loaded) => {
        const target = loaded.target;
        const parsed = JSON.parse(target.result);
        for (const p of parsed) {
            addMessage(p);
        }
        implscript_1.checkResize();
    };
    reader.readAsText(firstFile);
}
let currentScreenHeight = 100;
function checkResizeImpl(element) {
    const allowedHeight = element.clientHeight - currentScreenHeight;
    const ul = document.getElementById('list');
    if (ul === null) {
        return;
    }
    const listHeight = ul.clientHeight;
    if (listHeight < allowedHeight) {
        ul.style.position = 'fixed';
        ul.style.bottom = currentScreenHeight + 'px';
    }
    else {
        ul.style.position = 'static';
        ul.style.bottom = 'auto';
    }
}
exports.checkResizeImpl = checkResizeImpl;
function handleMessage(data) {
    switch (data.type) {
        case interfaces_1.SendTypes.New:
            addMessage(data.message);
            document.body.scrollTop = document.body.scrollHeight;
            break;
        case interfaces_1.SendTypes.Batch:
            for (const message of data.message) {
                addMessage(message);
            }
            document.body.scrollTop = document.body.scrollHeight;
            break;
        case interfaces_1.SendTypes.PauseUpdate:
            const pause = document.getElementById('pause');
            if (pause !== null) {
                pause.innerHTML = 'Paused: ' + data.message;
            }
            break;
        case interfaces_1.SendTypes.ConnectionChanged:
            const bMessage = data.message;
            if (bMessage === true) {
                onConnect();
            }
            else {
                onDisconnect();
            }
            break;
        default:
            break;
    }
    implscript_1.checkResize();
}
exports.handleMessage = handleMessage;
function createSplitUl(left) {
    const splitDiv = document.createElement('ul');
    splitDiv.style.position = 'fixed';
    splitDiv.style.bottom = '0px';
    if (left) {
        splitDiv.style.left = '0px';
    }
    else {
        splitDiv.style.right = '0px';
    }
    splitDiv.style.listStyleType = 'none';
    splitDiv.style.padding = '0';
    splitDiv.style.width = '49.8%';
    splitDiv.style.marginBottom = '1px';
    return splitDiv;
}
function createButton(id, text, callback) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.id = id;
    button.style.width = '100%';
    button.appendChild(document.createTextNode(text));
    button.addEventListener('click', callback);
    li.appendChild(button);
    return li;
}
function onChangeTeamNumber() {
    const newNumber = document.getElementById('teamNumber');
    console.log('finding team number');
    if (newNumber === null) {
        return;
    }
    console.log('sending message');
    implscript_1.sendMessage({
        message: parseInt(newNumber.value, 10),
        type: interfaces_1.ReceiveTypes.ChangeNumber,
    });
    console.log('sent message');
}
function setLivePage() {
    const mdv = document.getElementById('mainDiv');
    if (mdv === undefined) {
        return;
    }
    const mainDiv = mdv;
    currentScreenHeight = 100;
    mainDiv.innerHTML = '';
    const ul = document.createElement('ul');
    ul.id = 'list';
    ul.style.listStyleType = 'none';
    ul.style.padding = '0';
    mainDiv.appendChild(ul);
    const splitDiv = document.createElement('div');
    splitDiv.style.height = '100px';
    mainDiv.appendChild(splitDiv);
    const leftList = createSplitUl(true);
    leftList.appendChild(createButton('pause', 'Pause', onPause));
    leftList.appendChild(createButton('discard', 'Discard', onDiscard));
    leftList.appendChild(createButton('clear', 'Clear', onClear));
    leftList.appendChild(createButton('showprints', 'Don\'t Show Prints', onShowPrints));
    leftList.appendChild(createButton('switchPage', 'Switch to Viewer', () => {
        setViewerPage();
    }));
    mainDiv.appendChild(leftList);
    const rightList = createSplitUl(false);
    rightList.appendChild(createButton('showwarnings', 'Don\'t Show Warnings', onShowWarnings));
    rightList.appendChild(createButton('autoreconnect', 'Disconnect', onAutoReconnect));
    rightList.appendChild(createButton('timestamps', 'Show Timestamps', onShowTimestamps));
    rightList.appendChild(createButton('savelot', 'Save Log', onSaveLog));
    const teamNumberUl = document.createElement('li');
    const teamNumberI = document.createElement('input');
    teamNumberI.id = 'teamNumber';
    teamNumberI.type = 'number';
    teamNumberI.style.width = '50%';
    const teamNumberB = document.createElement('button');
    teamNumberB.id = 'changeTeamNumber';
    teamNumberB.style.width = '24.9%';
    teamNumberB.style.right = '0';
    teamNumberB.style.position = 'fixed';
    teamNumberB.addEventListener('click', onChangeTeamNumber);
    teamNumberB.appendChild(document.createTextNode('Set Team Number'));
    teamNumberUl.appendChild(teamNumberI);
    teamNumberUl.appendChild(teamNumberB);
    rightList.appendChild(teamNumberUl);
    mainDiv.appendChild(rightList);
    if (autoReconnect !== true) {
        onAutoReconnect();
    }
}
function setViewerPage() {
    const mdv = document.getElementById('mainDiv');
    if (mdv === undefined) {
        return;
    }
    if (autoReconnect === true) {
        onAutoReconnect();
    }
    const mainDiv = mdv;
    currentScreenHeight = 60;
    mainDiv.innerHTML = '';
    const ul = document.createElement('ul');
    ul.id = 'list';
    ul.style.listStyleType = 'none';
    ul.style.padding = '0';
    mainDiv.appendChild(ul);
    const splitDiv = document.createElement('div');
    splitDiv.style.height = '60px';
    mainDiv.appendChild(splitDiv);
    const leftList = createSplitUl(true);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'openFile';
    fileInput.name = 'files[]';
    fileInput.style.width = '100%';
    fileInput.addEventListener('change', handleFileSelect, false);
    leftList.appendChild(fileInput);
    leftList.appendChild(createButton('showprints', 'Don\'t Show Prints', onShowPrints));
    leftList.appendChild(createButton('switchPage', 'Switch to Live', () => {
        setLivePage();
    }));
    mainDiv.appendChild(leftList);
    const rightList = createSplitUl(false);
    rightList.appendChild(createButton('showwarnings', 'Don\'t Show Warnings', onShowWarnings));
    rightList.appendChild(createButton('timestamps', 'Show Timestamps', onShowTimestamps));
    mainDiv.appendChild(rightList);
}
exports.setViewerPage = setViewerPage;
window.addEventListener('load', (_) => {
    setLivePage();
});

},{"../script/implscript":1,"./interfaces":2,"./message":3}]},{},[4]);
