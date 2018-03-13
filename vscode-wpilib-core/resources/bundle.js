(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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
    })(ReceiveTypes = exports.ReceiveTypes || (exports.ReceiveTypes = {}));

    },{}],2:[function(require,module,exports){
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
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
            let slice = data.slice(count);
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
            if ((this.flags & 1) !== 0) {
                this.messageType = MessageType.Error;
            }
            else {
                this.messageType = MessageType.Warning;
            }
        }
        getSizedString(data, start) {
            let size = data.readUInt16BE(start);
            start += 2;
            let count = size + 2;
            return {
                byteLength: count,
                data: data.toString('utf8', start, start + count - 2)
            };
        }
    }
    exports.ErrorMessage = ErrorMessage;

    },{}],3:[function(require,module,exports){
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    const sharedscript_1 = require("./sharedscript");
    const interfaces_1 = require("../interfaces");
    function checkResize() {
        let allowedHeight = document.documentElement.clientHeight - 80;
        let ul = document.getElementById('list');
        if (ul === null) {
            return;
        }
        let listHeight = ul.clientHeight;
        if (listHeight < allowedHeight) {
            ul.style.position = 'fixed';
            ul.style.bottom = '80px';
        }
        else {
            ul.style.position = 'static';
            ul.style.bottom = 'auto';
        }
    }
    exports.checkResize = checkResize;
    function sendMessage(message) {
        window.parent.postMessage(message, '*');
    }
    exports.sendMessage = sendMessage;
    window.addEventListener('message', event => {
        let data = event.data;
        switch (data.type) {
            case interfaces_1.SendTypes.New:
                sharedscript_1.addMessage(data.message);
                document.body.scrollTop = document.body.scrollHeight;
                break;
            case interfaces_1.SendTypes.Batch:
                for (let message of data.message) {
                    sharedscript_1.addMessage(message);
                }
                document.body.scrollTop = document.body.scrollHeight;
                break;
            case interfaces_1.SendTypes.PauseUpdate:
                let pause = document.getElementById('pause');
                if (pause !== null) {
                    pause.innerHTML = 'Paused: ' + data.message;
                }
                break;
            case interfaces_1.SendTypes.ConnectionChanged:
                let bMessage = data.message;
                if (bMessage === true) {
                    sharedscript_1.onConnect();
                }
                else {
                    sharedscript_1.onDisconnect();
                }
                break;
            default:
                break;
        }
        checkResize();
    });

    },{"../interfaces":1,"./sharedscript":4}],4:[function(require,module,exports){
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    const implscript_1 = require("./implscript");
    const message_1 = require("../message");
    const interfaces_1 = require("../interfaces");
    let paused = false;
    function onPause() {
        if (paused === true) {
            paused = false;
            document.getElementById('pause').innerHTML = 'Pause';
            implscript_1.sendMessage({
                type: interfaces_1.ReceiveTypes.Pause,
                message: false
            });
        }
        else {
            paused = true;
            document.getElementById('pause').innerHTML = 'Paused: 0';
            implscript_1.sendMessage({
                type: interfaces_1.ReceiveTypes.Pause,
                message: true
            });
        }
    }
    exports.onPause = onPause;
    let discard = false;
    function onDiscard() {
        if (discard === true) {
            discard = false;
            document.getElementById('discard').innerHTML = 'Discard';
            implscript_1.sendMessage({
                type: interfaces_1.ReceiveTypes.Discard,
                message: false
            });
        }
        else {
            discard = true;
            document.getElementById('discard').innerHTML = 'Resume';
            implscript_1.sendMessage({
                type: interfaces_1.ReceiveTypes.Discard,
                message: true
            });
        }
    }
    exports.onDiscard = onDiscard;
    function onClear() {
        document.getElementById('list').innerHTML = '';
    }
    exports.onClear = onClear;
    let showWarnings = true;
    function onShowWarnings() {
        if (showWarnings === true) {
            showWarnings = false;
            document.getElementById('showwarnings').innerHTML = 'Show Warnings';
        }
        else {
            showWarnings = true;
            document.getElementById('showwarnings').innerHTML = 'Don\'t Show Warnings';
        }
        let ul = document.getElementById('list');
        let items = ul.getElementsByTagName('li');
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
        if (showPrints === true) {
            showPrints = false;
            document.getElementById('showprints').innerHTML = 'Show Prints';
        }
        else {
            showPrints = true;
            document.getElementById('showprints').innerHTML = 'Don\'t Show Prints';
        }
        let ul = document.getElementById('list');
        let items = ul.getElementsByTagName('li');
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
            document.getElementById('autoreconnect').innerHTML = 'Reconnect';
            // send a disconnect
            implscript_1.sendMessage({
                type: interfaces_1.ReceiveTypes.Reconnect,
                message: false
            });
        }
        else {
            autoReconnect = true;
            document.getElementById('autoreconnect').innerHTML = 'Disconnect';
            implscript_1.sendMessage({
                type: interfaces_1.ReceiveTypes.Reconnect,
                message: true
            });
        }
    }
    exports.onAutoReconnect = onAutoReconnect;
    let showTimestamps = false;
    function onShowTimestamps() {
        if (showTimestamps === true) {
            showTimestamps = false;
            document.getElementById('timestamps').innerHTML = 'Show Timestamps';
        }
        else {
            showTimestamps = true;
            document.getElementById('timestamps').innerHTML = 'Don\'t Show Timestamps';
        }
        let ul = document.getElementById('list');
        let items = ul.getElementsByTagName('li');
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
        let ul = document.getElementById('list');
        let items = ul.getElementsByTagName('li');
        let logs = [];
        for (let i = 0; i < items.length; ++i) {
            logs.push(items[i].dataset.message);
        }
        implscript_1.sendMessage({
            type: interfaces_1.ReceiveTypes.Save,
            message: logs
        });
    }
    exports.onSaveLog = onSaveLog;
    function onConnect() {
        let button = document.getElementById('autoreconnect');
        button.style.backgroundColor = 'Green';
    }
    exports.onConnect = onConnect;
    function onDisconnect() {
        let button = document.getElementById('autoreconnect');
        button.style.backgroundColor = 'Red';
    }
    exports.onDisconnect = onDisconnect;
    function insertMessage(ts, line, li, color) {
        let div = document.createElement('div');
        let tsSpan = document.createElement('span');
        tsSpan.appendChild(document.createTextNode(ts.toFixed(3) + ': '));
        tsSpan.dataset.timestamp = 'true';
        if (showTimestamps === true) {
            tsSpan.style.display = 'inline';
        }
        else {
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
    function insertStackTrace(st, li, color) {
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
    function insertLocation(loc, li, color) {
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
    function addMessage(message) {
        if (message.messageType === message_1.MessageType.Print) {
            addPrint(message);
        }
        else {
            addError(message);
        }
    }
    exports.addMessage = addMessage;
    function addPrint(message) {
        let ul = document.getElementById('list');
        let li = document.createElement('li');
        li.style.fontFamily = '"Courier New", Courier, monospace';
        insertMessage(message.timestamp, message.line, li);
        let str = JSON.stringify(message);
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
        let ul = document.getElementById('list');
        let li = document.createElement('li');
        li.style.fontFamily = '"Courier New", Courier, monospace';
        let str = JSON.stringify(message);
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
                let parsed = JSON.parse(li.dataset.message);
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
                let parsed = JSON.parse(li.dataset.message);
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
        let files = evt.target.files; // filelist
        let firstFile = files[0];
        let reader = new FileReader();
        reader.onload = (loaded) => {
            let target = loaded.target;
            let parsed = JSON.parse(target.result);
            for (let p of parsed) {
                addMessage(p);
            }
        };
        reader.readAsBinaryString(firstFile);
        console.log(evt.target);
        console.log(files);
    }
    let openFileButton = document.getElementById('open');
    if (openFileButton !== null) {
        openFileButton.addEventListener('change', handleFileSelect, false);
    }
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

    },{"../interfaces":1,"../message":2,"./implscript":3}]},{},[4]);
