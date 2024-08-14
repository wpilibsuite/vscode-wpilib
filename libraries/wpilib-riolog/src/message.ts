'use strict';

export enum MessageType {
  Error,
  Warning,
  Print,
}

export interface IMessage {
  readonly timestamp: number;
  readonly seqNumber: number;
  readonly messageType: MessageType;
}

export interface IPrintMessage extends IMessage {
  readonly line: string;
}

export interface IErrorMessage extends IMessage {
  readonly numOccur: number;
  readonly errorCode: number;
  readonly flags: number;
  readonly details: string;
  readonly location: string;
  readonly callStack: string;
}

export class PrintMessage implements IPrintMessage {
  public readonly timestamp: number;
  public readonly seqNumber: number;
  public readonly line: string;
  public readonly messageType: MessageType = MessageType.Print;

  constructor(data: Buffer) {
    let count = 0;
    this.timestamp = data.readFloatBE(count);
    count += 4;
    this.seqNumber = data.readInt16BE(count);
    count += 2;
    const slice = data.slice(count);
    this.line = slice.toString('utf8');
  }
}

interface IStringNumberPair {
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
  public readonly messageType: MessageType;

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
    this.messageType = (this.flags & 1) !== 0 ? MessageType.Error : MessageType.Warning;
  }

  private getSizedString(data: Buffer, start: number): IStringNumberPair {
    const size = data.readUInt16BE(start);
    start += 2;
    const count = size + 2;
    return {
      byteLength: count,
      data: data.toString('utf8', start, start + count - 2),
    };
  }
}
