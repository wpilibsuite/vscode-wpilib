(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":3,"timers":4}],5:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./interfaces"));
__export(require("./message"));
__export(require("./rioconnector"));
__export(require("./rioconsole"));
__export(require("./riologwindow"));

},{"./interfaces":6,"./message":7,"./rioconnector":9,"./rioconsole":10,"./riologwindow":11}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
        this.messageType = (this.flags & 1) !== 0 ? MessageType.Error : MessageType.Warning;
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

},{}],8:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class PromiseCondition {
    constructor() {
        this.hasBeenSet = false;
        this.condSet = undefined;
    }
    wait() {
        return new Promise((resolve, _) => {
            this.condSet = () => {
                resolve();
            };
            if (this.hasBeenSet === true) {
                resolve();
            }
        });
    }
    set() {
        this.hasBeenSet = true;
        if (this.condSet !== undefined) {
            this.condSet();
        }
    }
    reset() {
        this.condSet = undefined;
        this.hasBeenSet = false;
    }
}
exports.PromiseCondition = PromiseCondition;

},{}],9:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const timers = require("timers");
async function properRace(promises) {
    if (promises.length < 1) {
        return Promise.reject('Can\'t start a race without promises!');
    }
    // There is no way to know which promise is rejected.
    // So we map it to a new promise to return the index when it fails
    const indexPromises = promises.map((p, index) => p.catch(() => { throw index; }));
    try {
        return await Promise.race(indexPromises);
    }
    catch (index) {
        // The promise has rejected, remove it from the list of promises and just continue the race.
        console.log('reject promise');
        // tslint:disable-next-line:no-unsafe-any
        const p = promises.splice(index, 1)[0];
        p.catch((e) => console.log('A promise has been rejected, but awaiting others', e));
        return properRace(promises);
    }
}
const constantIps = [
    '172.22.11.2',
    '127.0.0.1',
];
const teamIps = [
    'roboRIO-TEAM-FRC.local',
    'roboRIO-TEAM-FRC.lan',
    'roboRIO-TEAM-FRC.frc-field.local',
];
function timerPromise(ms) {
    let timer;
    return {
        promise: new Promise((resolve, _) => {
            timer = timers.setTimeout(() => {
                resolve(undefined);
            }, ms);
        }),
        cancel() {
            if (timer === undefined) {
                return;
            }
            console.log('cancelled timer');
            timers.clearTimeout(timer);
        },
    };
}
class DSSocketPromisePair {
    constructor(rs, ds, p) {
        this.socket = rs;
        this.promise = p;
        this.dsSocket = ds;
    }
    dispose() {
        this.socket.emit('dispose');
        this.dsSocket.emit('dispose');
    }
}
function getSocketFromDS(port) {
    const s = new net.Socket();
    const ds = new net.Socket();
    const retVal = new DSSocketPromisePair(s, ds, new Promise((resolve, reject) => {
        // First connect to ds, and wait for data
        ds.on('data', (data) => {
            const parsed = JSON.parse(data.toString());
            if (parsed.robotIP === 0) {
                ds.end();
                ds.destroy();
                ds.removeAllListeners();
                reject();
                return;
            }
            let ipAddr = '';
            const ip = parsed.robotIP;
            // tslint:disable-next-line:no-bitwise
            ipAddr += ((ip >> 24) & 0xff) + '.';
            // tslint:disable-next-line:no-bitwise
            ipAddr += ((ip >> 16) & 0xff) + '.';
            // tslint:disable-next-line:no-bitwise
            ipAddr += ((ip >> 8) & 0xff) + '.';
            // tslint:disable-next-line:no-bitwise
            ipAddr += (ip & 0xff);
            s.on('error', (_) => {
                console.log('failed connection to ' + ip + ' at ' + port);
                s.end();
                s.destroy();
                s.removeAllListeners();
                reject();
            });
            s.on('timeout', () => {
                console.log('failed connection to ' + ip + ' at ' + port);
                s.end();
                s.destroy();
                s.removeAllListeners();
                reject();
            });
            s.on('close', () => {
                console.log('failed connection to ' + ip + ' at ' + port);
                s.end();
                s.destroy();
                s.removeAllListeners();
                reject();
            });
            s.on('dispose', () => {
                console.log('disposed ds connected');
                reject();
                s.end();
                s.destroy();
                s.removeAllListeners();
            });
            s.connect(port, ipAddr, () => {
                s.removeAllListeners();
                resolve(s);
            });
            ds.end();
            ds.destroy();
            ds.removeAllListeners();
        });
        ds.on('error', () => {
            reject();
        });
        ds.on('dispose', () => {
            console.log('disposed ds');
            reject();
            ds.end();
            ds.destroy();
            ds.removeAllListeners();
        });
        ds.connect(1742, '127.0.0.1');
    }));
    return retVal;
}
class RawSocketPromisePair {
    constructor(rs, p) {
        this.socket = rs;
        this.promise = p;
    }
    dispose() {
        this.socket.emit('dispose');
    }
}
function getSocketFromIP(port, ip) {
    const s = new net.Socket();
    return new RawSocketPromisePair(s, new Promise((resolve, reject) => {
        s.on('error', (_) => {
            console.log('failed connection to ' + ip + ' at ' + port);
            s.end();
            s.destroy();
            s.removeAllListeners();
            reject();
        });
        s.on('timeout', () => {
            console.log('failed connection to ' + ip + ' at ' + port);
            s.end();
            s.destroy();
            s.removeAllListeners();
            reject();
        });
        s.on('close', () => {
            s.end();
            s.destroy();
            s.removeAllListeners();
            reject();
        });
        s.on('dispose', () => {
            console.log('disposed', ip);
            reject();
            s.end();
            s.destroy();
            s.removeAllListeners();
        });
        s.connect(port, ip, () => {
            s.removeAllListeners();
            resolve(s);
        });
    }));
}
async function connectToRobot(port, teamNumber, timeout) {
    const pairs = [];
    teamNumber = Math.trunc(teamNumber);
    for (const c of constantIps) {
        pairs.push(getSocketFromIP(port, c));
    }
    for (const c of teamIps) {
        pairs.push(getSocketFromIP(port, c.replace('TEAM', teamNumber.toString())));
    }
    pairs.push(getSocketFromIP(port, `10.${Math.trunc(teamNumber / 100)}.${teamNumber % 100}.2`));
    pairs.push(getSocketFromDS(port));
    const connectors = [];
    for (const p of pairs) {
        connectors.push(p.promise);
    }
    const timer = timerPromise(timeout);
    connectors.push(timer.promise);
    const firstDone = await properRace(connectors);
    if (firstDone === undefined) {
        // Kill all
        for (const p of pairs) {
            p.dispose();
            try {
                await p.promise;
                // tslint:disable-next-line:no-empty
            }
            catch (_a) {
            }
        }
    }
    else {
        // Kill all but me
        timer.cancel();
        for (const p of pairs) {
            if (firstDone !== p.socket) {
                p.dispose();
                try {
                    await p.promise;
                    // tslint:disable-next-line:no-empty
                }
                catch (_b) {
                }
            }
        }
    }
    return firstDone;
}
exports.connectToRobot = connectToRobot;

},{"net":1,"timers":4}],10:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const message_1 = require("./message");
const promisecond_1 = require("./promisecond");
const rioconnector_1 = require("./rioconnector");
class RioConsole extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.discard = false;
        this.connected = false;
        this.autoReconnect = true;
        this.cleanup = false;
        this.condition = new promisecond_1.PromiseCondition();
        this.teamNumber = 0;
    }
    stop() {
        this.cleanup = true;
        this.closeSocket();
    }
    getAutoReconnect() {
        return this.autoReconnect;
    }
    setAutoReconnect(value) {
        this.autoReconnect = value;
        if (value === true) {
            this.condition.set();
        }
    }
    startListening() {
        const asyncFunction = async () => {
            while (!this.cleanup) {
                while (!this.autoReconnect) {
                    if (this.cleanup) {
                        return;
                    }
                    await this.condition.wait();
                    this.condition.reset();
                }
                await this.runFunction(this.teamNumber);
            }
            console.log('finished loop');
        };
        this.promise = asyncFunction();
    }
    closeSocket() {
        if (this.closeFunc !== undefined) {
            this.closeFunc();
        }
    }
    disconnect() {
        this.closeSocket();
    }
    setTeamNumber(teamNumber) {
        this.teamNumber = teamNumber;
    }
    async dispose() {
        this.stop();
        this.removeAllListeners();
        await this.promise;
    }
    async connect(teamNumber) {
        const socket = await rioconnector_1.connectToRobot(1741, teamNumber, 2000);
        if (socket === undefined) {
            return undefined;
        }
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 500);
        return socket;
    }
    handleData(data) {
        if (this.discard) {
            return;
        }
        let count = 0;
        let len = 0;
        do {
            len = data.readUInt16BE(count);
            count += 2;
        } while (len === 0);
        const tag = data.readUInt8(count);
        count++;
        const outputBuffer = data.slice(3, len + 2);
        const extendedBuf = data.slice(2 + len);
        if (tag === 11) {
            // error or warning.
            const m = new message_1.ErrorMessage(outputBuffer);
            this.emit('message', m);
        }
        else if (tag === 12) {
            const m = new message_1.PrintMessage(outputBuffer);
            this.emit('message', m);
        }
        if (extendedBuf.length > 0) {
            this.handleData(extendedBuf);
        }
    }
    async runFunction(teamNumber) {
        const socket = await this.connect(teamNumber);
        if (socket === undefined) {
            console.log('bad socket');
            return;
        }
        this.connected = true;
        this.emit('connectionChanged', true);
        console.log('succesfully connected');
        socket.on('data', (data) => {
            this.handleData(data);
        });
        if (this.cleanup) {
            socket.end();
            socket.destroy();
            socket.removeAllListeners();
            return;
        }
        await new Promise((resolve, _) => {
            this.closeFunc = () => {
                socket.end();
                socket.destroy();
                socket.removeAllListeners();
                resolve();
                console.log('closed locally');
            };
            socket.on('close', () => {
                socket.removeAllListeners();
                resolve();
                console.log('closed remotely (close)');
            });
            socket.on('end', () => {
                socket.removeAllListeners();
                resolve();
                console.log('closed remotely (end)');
            });
        });
        this.connected = false;
        this.emit('connectionChanged', false);
    }
}
exports.RioConsole = RioConsole;

},{"./message":7,"./promisecond":8,"./rioconnector":9,"events":2}],11:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:max-line-length
const interfaces_1 = require("./interfaces");
class RioLogWindow {
    constructor(windowProv, rioConProivder) {
        this.webview = undefined;
        this.rioConsole = undefined;
        this.running = false;
        this.disposables = [];
        this.pausedArray = [];
        this.paused = false;
        this.hiddenArray = [];
        this.windowProvider = windowProv;
        this.rioConsoleProvider = rioConProivder;
    }
    start(teamNumber) {
        if (this.running) {
            return;
        }
        this.running = true;
        this.createWebView();
        this.createRioConsole();
        if (this.webview === undefined || this.rioConsole === undefined) {
            return;
        }
        this.webview.on('didDispose', () => {
            if (this.rioConsole !== undefined) {
                this.rioConsole.stop();
                this.rioConsole.removeAllListeners();
            }
            this.rioConsole = undefined;
            this.webview = undefined;
            this.running = false;
        });
        this.webview.on('didReceiveMessage', async (data) => {
            await this.onMessageReceived(data);
        });
        this.rioConsole.on('connectionChanged', async (c) => {
            await this.onConnectionChanged(c);
        });
        this.rioConsole.on('message', async (message) => {
            await this.onNewMessageToSend(message);
        });
        this.rioConsole.setTeamNumber(teamNumber);
        this.rioConsole.startListening();
    }
    stop() {
        if (this.webview !== undefined) {
            this.webview.dispose();
        }
    }
    dispose() {
        this.stop();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
    createWebView() {
        this.webview = this.windowProvider.createWindowView();
        this.webview.on('windowActive', async () => {
            if (this.webview === undefined) {
                return;
            }
            // Window goes active.
            await this.webview.postMessage({
                message: this.hiddenArray,
                type: interfaces_1.SendTypes.Batch,
            });
            if (this.rioConsole !== undefined) {
                if (this.rioConsole.connected === true) {
                    await this.webview.postMessage({
                        message: true,
                        type: interfaces_1.SendTypes.ConnectionChanged,
                    });
                }
                else {
                    await this.webview.postMessage({
                        message: false,
                        type: interfaces_1.SendTypes.ConnectionChanged,
                    });
                }
            }
        });
    }
    createRioConsole() {
        this.rioConsole = this.rioConsoleProvider.getRioConsole();
    }
    async sendPaused() {
        if (this.webview === undefined) {
            return;
        }
        const success = await this.webview.postMessage({
            message: this.pausedArray,
            type: interfaces_1.SendTypes.Batch,
        });
        if (!success) {
            this.hiddenArray.push(...this.pausedArray);
        }
        this.pausedArray = [];
    }
    async onConnectionChanged(connected) {
        if (this.webview === undefined) {
            return;
        }
        if (connected) {
            await this.webview.postMessage({
                message: true,
                type: interfaces_1.SendTypes.ConnectionChanged,
            });
        }
        else {
            await this.webview.postMessage({
                message: false,
                type: interfaces_1.SendTypes.ConnectionChanged,
            });
        }
    }
    async onNewMessageToSend(message) {
        if (this.webview === undefined) {
            return;
        }
        if (this.paused === true) {
            this.pausedArray.push(message);
            await this.webview.postMessage({
                message: this.pausedArray.length,
                type: interfaces_1.SendTypes.PauseUpdate,
            });
        }
        else {
            const success = await this.webview.postMessage({
                message,
                type: interfaces_1.SendTypes.New,
            });
            if (!success) {
                this.hiddenArray.push(message);
            }
        }
    }
    async onMessageReceived(data) {
        if (this.rioConsole === undefined) {
            return;
        }
        if (data.type === interfaces_1.ReceiveTypes.Discard) {
            this.rioConsole.discard = data.message;
        }
        else if (data.type === interfaces_1.ReceiveTypes.Pause) {
            const old = this.paused;
            this.paused = data.message;
            if (old === true && this.paused === false) {
                await this.sendPaused();
            }
        }
        else if (data.type === interfaces_1.ReceiveTypes.Save) {
            if (this.webview === undefined) {
                return;
            }
            const deserializedLogs = [];
            for (const d of data.message) {
                const parsed = JSON.parse(d);
                deserializedLogs.push(parsed);
            }
            await this.webview.handleSave(deserializedLogs);
        }
        else if (data.type === interfaces_1.ReceiveTypes.Reconnect) {
            const newValue = data.message;
            this.rioConsole.setAutoReconnect(newValue);
            if (newValue === false) {
                this.rioConsole.disconnect();
            }
        }
        else if (data.type === interfaces_1.ReceiveTypes.ChangeNumber) {
            const number = data.message;
            console.log('setting team number');
            this.rioConsole.setTeamNumber(number);
        }
    }
}
exports.RioLogWindow = RioLogWindow;

},{"./interfaces":6}],12:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const sharedscript_1 = require("../shared/sharedscript");
const vscode = acquireVsCodeApi();
function checkResize() {
    sharedscript_1.checkResizeImpl(document.documentElement);
}
exports.checkResize = checkResize;
function scrollImpl() {
    document.body.scrollTop = document.body.scrollHeight;
}
exports.scrollImpl = scrollImpl;
function sendMessage(message) {
    vscode.postMessage(message, '*');
}
exports.sendMessage = sendMessage;
window.addEventListener('message', (event) => {
    const data = event.data;
    sharedscript_1.handleMessage(data);
});

},{"../shared/sharedscript":13}],13:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:prefer-conditional-expression */
const wpilib_riolog_1 = require("wpilib-riolog");
const implscript_1 = require("../script/implscript");
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
            type: wpilib_riolog_1.ReceiveTypes.Pause,
        });
    }
    else {
        paused = true;
        pauseElement.innerHTML = 'Paused: 0';
        implscript_1.sendMessage({
            message: true,
            type: wpilib_riolog_1.ReceiveTypes.Pause,
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
            type: wpilib_riolog_1.ReceiveTypes.Discard,
        });
    }
    else {
        discard = true;
        dButton.innerHTML = 'Resume';
        implscript_1.sendMessage({
            message: true,
            type: wpilib_riolog_1.ReceiveTypes.Discard,
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
            type: wpilib_riolog_1.ReceiveTypes.Reconnect,
        });
    }
    else {
        autoReconnect = true;
        implscript_1.sendMessage({
            message: true,
            type: wpilib_riolog_1.ReceiveTypes.Reconnect,
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
        type: wpilib_riolog_1.ReceiveTypes.Save,
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
    if (message.messageType === wpilib_riolog_1.MessageType.Print) {
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
    if (message.messageType === wpilib_riolog_1.MessageType.Warning) {
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
        case wpilib_riolog_1.SendTypes.New:
            addMessage(data.message);
            implscript_1.scrollImpl();
            break;
        case wpilib_riolog_1.SendTypes.Batch:
            for (const message of data.message) {
                addMessage(message);
            }
            implscript_1.scrollImpl();
            break;
        case wpilib_riolog_1.SendTypes.PauseUpdate:
            const pause = document.getElementById('pause');
            if (pause !== null) {
                pause.innerHTML = 'Paused: ' + data.message;
            }
            break;
        case wpilib_riolog_1.SendTypes.ConnectionChanged:
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
        type: wpilib_riolog_1.ReceiveTypes.ChangeNumber,
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

},{"../script/implscript":12,"wpilib-riolog":5}]},{},[13]);
