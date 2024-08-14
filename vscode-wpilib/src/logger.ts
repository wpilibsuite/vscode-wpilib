'use strict';

import * as path from 'path';
import { MESSAGE } from 'triple-beam';
import * as winston from 'winston';

export interface ILogger {
  error(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  log(message: string, ...meta: unknown[]): void;
}

const myFormat = winston.format.printf((info) => {
  return `${info.timestamp} ${info[MESSAGE]}`;
});

const winstonLogger = winston.createLogger({
  exitOnError: false,
  format: winston.format.combine(
    winston.format.simple(),
    winston.format.timestamp(),
    myFormat,
  ),
  level: 'verbose',
  transports: [
    new winston.transports.Console(),
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
  mainLogFile = path.join(dirname, 'wpilibtoollog.txt');
  winstonLogger.add(new winston.transports.File({
    dirname,
    filename: 'wpilibtoollog.txt',
    level: 'verbose',
    maxFiles: 3,
    maxsize: 1000000,
    tailable: true,
  }));
}

class LoggerImpl implements ILogger {
  public error(message: string, ...meta: unknown[]): void {
    winstonLogger.log('error', message, meta);
  }
  public warn(message: string, ...meta: unknown[]): void {
    winstonLogger.log('warn', message, meta);
  }
  public info(message: string, ...meta: unknown[]): void {
    winstonLogger.log('info', message, meta);
  }
  public log(message: string, ...meta: unknown[]): void {
    winstonLogger.log('verbose', message, meta);
  }
}

export const logger: ILogger = new LoggerImpl();
