'use strict';

import * as path from 'path';
import * as winston from 'winston';

export interface ILogger {
  error(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  log(message: string, ...meta: unknown[]): void;
}

const myFormat = winston.format.printf((info) => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const winstonLogger = winston.createLogger({
  exitOnError: false,
  format: winston.format.combine(winston.format.timestamp(), winston.format.simple(), myFormat),
  level: 'verbose',
  transports: [new winston.transports.Console()],
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
