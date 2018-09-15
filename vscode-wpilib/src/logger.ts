'use strict';

export interface ILogger {
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  log(message: string): void;
}

class LoggerImpl implements ILogger {
  private logRootDir: string;

  constructor() {
    this.logRootDir = '';
    console.log(this.logRootDir);
  }

  public setLogDir(dir: string) {
    this.logRootDir = dir;
  }

  public error(message: string): void {
    console.log(message);
  }
  public warn(message: string): void {
    console.log(message);
  }
  public info(message: string): void {
    console.log(message);
  }
  public log(message: string): void {
    console.log(message);
  }
}

const loggerImpl: LoggerImpl = new LoggerImpl();
export const logger: ILogger = loggerImpl;

export function setLogDir(dir: string) {
  loggerImpl.setLogDir(dir);
}
