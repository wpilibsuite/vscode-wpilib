'use strict';

import * as assert from 'assert';
import * as riolog from '../index';
import { IErrorMessage, MessageType } from '../message';

function checkErrorEqual(a: IErrorMessage, b: IErrorMessage): void {
  assert.strictEqual(a.callStack, b.callStack);
  assert.strictEqual(a.location, b.location);
  assert.strictEqual(a.details, b.details);
  assert.strictEqual(a.errorCode, b.errorCode);
  assert.strictEqual(a.flags, b.flags);
  assert.strictEqual(a.messageType, b.messageType);
  assert.strictEqual(a.seqNumber, b.seqNumber);
  assert.strictEqual(a.timestamp, b.timestamp);
  assert.strictEqual(a.numOccur, b.numOccur);
}

function getBufferFromError(message: IErrorMessage): Buffer {
  const buffer = new Buffer(65535);
  let count = 0;
  buffer.writeInt8(0, count);
  count++;
  buffer.writeInt8(0, count);
  count++;
  buffer.writeUInt8(11, count);
  count++;
  buffer.writeFloatBE(message.timestamp, count);
  count += 4;
  buffer.writeInt16BE(message.seqNumber, count);
  count += 2;
  buffer.writeInt16BE(message.numOccur, count);
  count += 2;
  buffer.writeInt32BE(message.errorCode, count);
  count += 4;
  buffer.writeUInt8(message.flags, count);
  count += 1;

  buffer.writeUInt16BE(message.details.length, count);
  count += 2;
  count += buffer.write(message.details, count, undefined, 'utf8');

  buffer.writeUInt16BE(message.location.length, count);
  count += 2;
  count += buffer.write(message.location, count, undefined, 'utf8');

  buffer.writeUInt16BE(message.callStack.length, count);
  count += 2;
  count += buffer.write(message.callStack, count, undefined, 'utf8');

  buffer.writeUInt16BE(count - 2, 0);

  return buffer.slice(0, count);
}

suite('Input Error Buffer Tests', () => {
  [true, false].forEach((x) => {
    test(`Single Buffer Full ${x ? 'Error' : 'Warning'}`, () => {
      const rioconsole = new riolog.RioConsole();
      const message: IErrorMessage = {
        callStack: 'Test',
        details: 'Hello',
        errorCode: 2345,
        flags: x ? 1 : 0,
        location: 'World',
        messageType: x ? MessageType.Error : MessageType.Warning,
        numOccur: 2,
        seqNumber: 3,
        timestamp: 42.5,
      };
      rioconsole.on('message', (m: riolog.IErrorMessage) => {
        checkErrorEqual(message, m);
      });
      const buf = getBufferFromError(message);
      rioconsole.handleBuffer(buf);
    });
  });

  [true, false].forEach((x) => {
    test(`Split Buffer Full ${x ? 'Error' : 'Warning'}`, () => {
      const rioconsole = new riolog.RioConsole();
      const message: IErrorMessage = {
        callStack: 'Test',
        details: 'Hello',
        errorCode: 2345,
        flags: x ? 1 : 0,
        location: 'World',
        messageType: x ? MessageType.Error : MessageType.Warning,
        numOccur: 2,
        seqNumber: 3,
        timestamp: 42.5,
      };
      rioconsole.on('message', (m: riolog.IErrorMessage) => {
        checkErrorEqual(message, m);
      });
      const buf = getBufferFromError(message);
      const bufa = buf.slice(0, 10);
      const bufb = buf.slice(10);
      rioconsole.handleBuffer(bufa);
      rioconsole.handleBuffer(bufb);
    });
  });

  [true, false].forEach((x) => {
    test(`Split Length Buffer Full ${x ? 'Error' : 'Warning'}`, () => {
      const rioconsole = new riolog.RioConsole();
      const message: IErrorMessage = {
        callStack: 'Test',
        details: 'Hello',
        errorCode: 2345,
        flags: x ? 1 : 0,
        location: 'World',
        messageType: x ? MessageType.Error : MessageType.Warning,
        numOccur: 2,
        seqNumber: 3,
        timestamp: 42.5,
      };
      rioconsole.on('message', (m: riolog.IErrorMessage) => {
        checkErrorEqual(message, m);
      });
      const buf = getBufferFromError(message);
      const bufa = buf.slice(0, 1);
      const bufb = buf.slice(1);
      rioconsole.handleBuffer(bufa);
      rioconsole.handleBuffer(bufb);
    });
  });

  [true, false].forEach((x) => {
    test(`Split Length 2 Buffer Full ${x ? 'Error' : 'Warning'}`, () => {
      const rioconsole = new riolog.RioConsole();
      const message: IErrorMessage = {
        callStack: 'Test',
        details: 'Hello',
        errorCode: 2345,
        flags: x ? 1 : 0,
        location: 'World',
        messageType: x ? MessageType.Error : MessageType.Warning,
        numOccur: 2,
        seqNumber: 3,
        timestamp: 42.5,
      };
      rioconsole.on('message', (m: riolog.IErrorMessage) => {
        checkErrorEqual(message, m);
      });
      const buf = getBufferFromError(message);
      const bufa = buf.slice(0, 1);
      const bufb = buf.slice(1, 2);
      const bufc = buf.slice(2);
      rioconsole.handleBuffer(bufa);
      rioconsole.handleBuffer(bufb);
      rioconsole.handleBuffer(bufc);
    });
  });

  [true, false].forEach((x) => {
    test(`Double Split Buffer Full ${x ? 'Error' : 'Warning'}`, () => {
      const rioconsole = new riolog.RioConsole();
      const message: IErrorMessage = {
        callStack: 'Test',
        details: 'Hello',
        errorCode: 2345,
        flags: x ? 1 : 0,
        location: 'World',
        messageType: x ? MessageType.Error : MessageType.Warning,
        numOccur: 2,
        seqNumber: 3,
        timestamp: 42.5,
      };
      let count = 0;
      rioconsole.on('message', (m: riolog.IErrorMessage) => {
        checkErrorEqual(message, m);
        count++;
      });
      const buf = getBufferFromError(message);
      const newBuf = new Buffer(buf.length * 2);
      buf.copy(newBuf, 0, 0, buf.length);
      buf.copy(newBuf, buf.length, 0, buf.length);
      const bufa = newBuf.slice(0, buf.length - 10);
      const bufb = newBuf.slice(buf.length - 10, buf.length + 10);
      const bufc = newBuf.slice(buf.length + 10);
      rioconsole.handleBuffer(bufa);
      rioconsole.handleBuffer(bufb);
      assert.strictEqual(1, count);
      rioconsole.handleBuffer(bufc);
      assert.strictEqual(2, count);
    });
  });
});

