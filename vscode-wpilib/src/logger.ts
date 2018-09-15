'use strict';

import { TransformableInfo } from 'logform';
import * as path from 'path';
import { MESSAGE } from 'triple-beam';
import * as vscode from 'vscode';
import * as winston from 'winston';
import * as Transport from 'winston-transport';

export interface ILogger {
  // tslint:disable-next-line:no-any
  error(message: string, ...meta: any[]): void;
  // tslint:disable-next-line:no-any
  warn(message: string, ...meta: any[]): void;
  // tslint:disable-next-line:no-any
  info(message: string, ...meta: any[]): void;
  // tslint:disable-next-line:no-any
  log(message: string, ...meta: any[]): void;
}

const myFormat = winston.format.printf((info) => {
  return `${info.timestamp} ${info[MESSAGE]}`;
});

class OutputTransport extends Transport {
  private outputChannel: vscode.OutputChannel;
  public constructor() {
    super();
    this.outputChannel = vscode.window.createOutputChannel('WPILib Log');
  }

  public log(info: TransformableInfo, next: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    this.outputChannel.appendLine(info[MESSAGE] as string);

    next();
  }
}

const winstonLogger = winston.createLogger({
  exitOnError: false,
  format: winston.format.combine(
    winston.format.simple(),
    winston.format.timestamp(),
    myFormat,
  ),
  level: 'verbose',
  transports: [
    new OutputTransport(),
  ],
});

export function closeLogger() {
  winstonLogger.close();
}

let mainLogFile: string = '';
export function getMainLogFile(): string {
  return mainLogFile;
}

export function setLoggerDirectory(dirname: string) {
  mainLogFile = path.join(dirname, 'wpiliblog.txt');
  winstonLogger.add(new winston.transports.File({
    dirname,
    filename: 'wpiliblog.txt',
    level: 'verbose',
    maxFiles: 3,
    maxsize: 1000000,
    tailable: true,
  }));
}

class LoggerImpl implements ILogger {
  // tslint:disable-next-line:no-any
  public error(message: string, ...meta: any[]): void {
    winstonLogger.log('error', message, meta);
  }
  // tslint:disable-next-line:no-any
  public warn(message: string, ...meta: any[]): void {
    winstonLogger.log('warn', message, meta);
  }
  // tslint:disable-next-line:no-any
  public info(message: string, ...meta: any[]): void {
    winstonLogger.log('info', message, meta);
  }
  // tslint:disable-next-line:no-any
  public log(message: string, ...meta: any[]): void {
    winstonLogger.log('verbose', message, meta);
  }
}

export const logger: ILogger = new LoggerImpl();
