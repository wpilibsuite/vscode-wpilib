'use strict';
import * as vscode from 'vscode';
import * as net from 'net';
import * as timers from 'timers';

function socketConnect(addr: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    timers.setTimeout(() => {
      reject('Out of time');
    }, 5000);

    var server = net.createServer(function (stream) {
      resolve(stream);
    });

    server.listen(addr);
    //server.listen('\\\\.\\pipe\\tmp\\test.sock');
  });
}

export class TerminalPipe {
  private terminal: vscode.Terminal | undefined;
  //private pathToResourcesFolder: string;
  private pipe: net.Socket | undefined;
  private terminalName: string;


  static pipeCount = 0;

  constructor(_: string, terminalName: string) {
    //this.pathToResourcesFolder = pathToResourcesFolder;
    this.terminalName = terminalName;
  }

  private startTerminal() {
    this.terminal = vscode.window.createTerminal(this.terminalName);
  }

  public async open(): Promise<void> {
    let str: string | undefined;
    if (this.pipe === undefined) {
      str = '\\\\.\\pipe\\wpilib\\sock' + TerminalPipe.pipeCount;
      TerminalPipe.pipeCount++;
      this.pipe = await socketConnect(str);
    }
    if (this.terminal !== undefined) {
      let pid = await this.terminal.processId;
      try {
        process.kill(pid, 0);
      } catch (error) {
        // pid does not exist. Start it
        this.startTerminal();
      }
    } else {
      this.startTerminal();
    }


  }

  public close() {

  }

  public write(val: string) {
    if (this.pipe !== undefined) {
      this.pipe.write(val);
    }
  }

  dispose() {
    if (this.pipe !== undefined) {
      this.pipe.destroy();
    }
  }
}
