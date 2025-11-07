'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as winston from 'winston';
import * as TransportStream from 'winston-transport';

export interface ILogger {
  error(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  log(message: string, ...meta: unknown[]): void;
}

class VsCodeOutputTransport extends TransportStream {
  private channel: vscode.LogOutputChannel;

  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts);
    this.channel = vscode.window.createOutputChannel('WPILib', { log: true });
  }

  public log(info: winston.LogEntry, next: () => void) {
    setImmediate(() => this.emit('logged', info));
    switch (info.level) {
      case 'error':
        this.channel.error(info.message, info.meta);
        break;
      case 'warn':
        this.channel.warn(info.message, info.meta);
        break;
      // Log everything info and below as info
      default:
        this.channel.info(info.message, info.meta);
        break;
    }
    next();
  }
}

const myFormat = winston.format.printf((info) => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const winstonLogger = winston.createLogger({
  exitOnError: false,
  format: winston.format.combine(winston.format.timestamp(), winston.format.simple(), myFormat),
  level: 'verbose',
  transports: [new VsCodeOutputTransport()],
});

export function closeLogger() {
  winstonLogger.close();
}

let mainLogFile: string = '';
export function getMainLogFile(): string {
  return mainLogFile;
}

export function setLoggerDirectory(dirname: string) {
  mainLogFile = path.join(dirname, 'wpilibtoollog.txt');
  winstonLogger.add(
    new winston.transports.File({
      dirname,
      filename: 'wpilibtoollog.txt',
      level: 'verbose',
      maxFiles: 3,
      maxsize: 1000000,
      tailable: true,
    })
  );
}

class LoggerImpl implements ILogger {
  public error(message: string, ...meta: unknown[]): void {
    winstonLogger.log({ level: 'error', message, meta });
  }
  public warn(message: string, ...meta: unknown[]): void {
    winstonLogger.log({ level: 'warn', message, meta });
  }
  public info(message: string, ...meta: unknown[]): void {
    winstonLogger.log({ level: 'info', message, meta });
  }
  public log(message: string, ...meta: unknown[]): void {
    winstonLogger.log({ level: 'verbose', message, meta });
  }
}

export const logger: ILogger = new LoggerImpl();
