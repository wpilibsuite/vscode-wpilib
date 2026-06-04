'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as winston from 'winston';
import * as TransportStream from 'winston-transport';

const outputChannel = vscode.window.createOutputChannel('WPILib', { log: true });
class VsCodeOutputTransport extends TransportStream {
  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts);
  }

  public log(info: winston.LogEntry, next: () => void) {
    setImmediate(() => this.emit('logged', info));
    switch (info.level) {
      case 'error':
        outputChannel.error(info.message, ...info.meta);
        break;
      case 'warn':
        outputChannel.warn(info.message, ...info.meta);
        break;
      // Log everything info and below as info
      default:
        outputChannel.info(info.message, ...info.meta);
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
  outputChannel.dispose();
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

class Logger {
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

export const logger = new Logger();
