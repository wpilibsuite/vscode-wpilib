'use strict';

export enum MessageType {
  Dummy,
  Error,
  Warning,
  Print
}

export class MessageRenderOptions {
  showTimestamp: boolean = false;
  timestampDecimals: number = 3;
  showErrorCode: boolean = true;
  showErrorLocation: boolean = true;
  showErrorCallstack: boolean = true;
  showWarningLocation: boolean = true;
  showWarningCallstack: boolean = false;
}

export interface IMessage {
  getMessageType(): MessageType;
}

export class PrintMessage implements IMessage {
  public readonly timestamp: number;
  public readonly seqNumber: number;
  public readonly line: string;

  constructor(data: Buffer) {
    let count = 0;
    this.timestamp = data.readFloatBE(count);
    count += 4;
    this.seqNumber = data.readInt16BE(count);
    count += 2;
    let slice = data.slice(count);
    this.line = slice.toString('utf8');
  }

  getMessageType(): MessageType {
    return MessageType.Print;
  }


}

interface StringNumberPair {
  byteLength: number;
  data: string;
}

export class ErrorMessage implements IMessage {
  public readonly timestamp: number;
  public readonly seqNumber: number;
  public readonly numOccur: number;
  public readonly errorCode: number;
  public readonly flags: number;
  public readonly details: string;
  public readonly location: string;
  public readonly callStack: string;

  constructor(data: Buffer) {
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
  }

  private getSizedString(data: Buffer, start: number): StringNumberPair {
    let size = data.readUInt16BE(start);
    start += 2;
    let count = size + 2;
    //let slice = data.slice(start, start + size);
    return {
      byteLength: count,
      data: data.toString('utf8', start, start + count - 2)
    };
  }

  getMessageType(): MessageType {
    if ((this.flags & 1) !== 0) {
      return MessageType.Error;
    } else {
      return MessageType.Warning;
    }
  }

  isError(): boolean {
    return (this.flags & 1) !== 0;
  }

  isWarning(): boolean {
    return (this.flags & 1) === 0;
  }
}
