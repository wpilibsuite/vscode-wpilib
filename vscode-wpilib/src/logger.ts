'use strict';

import { TransformableInfo } from 'logform';
import { MESSAGE } from 'triple-beam';
import * as vscode from 'vscode';
import * as winston from 'winston';
import * as Transport from 'winston-transport';

export interface ILogger {
  error(message: string, ...meta: Array<unknown>): void;
  warn(message: string, ...meta: Array<unknown>): void;
  info(message: string, ...meta: Array<unknown>): void;
  log(message: string, ...meta: Array<unknown>): void;
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

    this.outputChannel.appendLine(info[MESSAGE]);

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

export function setLoggerDirectory(dirname: string) {
  winstonLogger.add(new winston.transports.File({
    dirname,
    filename: 'log.txt',
    level: 'verbose',
    maxFiles: 3,
    maxsize: 1000000,
    tailable: true,
  }));
}

class LoggerImpl implements ILogger {
  public error(message: string, ...meta: Array<unknown>): void {
    winstonLogger.log('error', message, meta);
  }
  public warn(message: string, ...meta: Array<unknown>): void {
    winstonLogger.log('warn', message, meta);
  }
  public info(message: string, ...meta: Array<unknown>): void {
    winstonLogger.log('info', message, meta);
  }
  public log(message: string, ...meta: Array<unknown>): void {
    winstonLogger.log('verbose', message, meta);
  }
}

export const logger: ILogger = new LoggerImpl();
